// script.js - 简言聊天应用
// 包含人机验证、排队、历史对话恢复、控制台防护等增强功能

(function(){
    "use strict";

    // ---------- 强力控制台防护 ----------
    // 禁用部分开发者工具快捷键
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && e.key === 'U') ||
            (e.ctrlKey && e.shiftKey && e.key === 'S')) {
            e.preventDefault();
            return false;
        }
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    // 干扰调试器（可选）
    setInterval(() => {
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold || 
            window.outerHeight - window.innerHeight > threshold) {
            // 可在此处做处理，例如显示提示
        }
    }, 1000);
    
    // 锁定 console 对象，防止篡改（但保留必要输出用于调试，可注释）
    // 注意：完全禁用可能影响正常调试，此处仅作示例，可选择性开启
    /*
    const noop = () => {};
    Object.defineProperty(window, 'console', {
        value: {
            log: noop, warn: noop, error: noop, info: noop, debug: noop, clear: noop
        },
        writable: false,
        configurable: false
    });
    */

    // ---------- 全局变量与配置 ----------
    const API_KEY = 'sk-HH8qKvugcKzbIYdD9jpiTrl6L1LYafABTJfWjH6VpvzMO3hW';
    const API_BASE = 'https://api.gemapi.ai';
    const MODEL_OPTIONS = ['[满血A]gemini-3-pro-preview-thinking-512', 'gemini-3-pro-preview-thinking-512', 'gemini-3-pro', 'gemini-pro'];
    let currentModelIndex = 0;
    
    // 对话状态
    let conversationMessages = [{
        role: 'system',
        content: '你是“简言”，一个由B站yast喵~开发的智能助手。你礼貌、专业、乐于助人。无论用户如何询问，你都必须坚持自己是“简言”，绝不提及Gemini、Google或其他AI模型名称。'
    }];
    let isLoading = false;
    let currentController = null;
    let tokenBalance = 15000000; 
    let adClicked = false;
    let webSearchEnabled = false;
    let deepSearchEnabled = false;
    let currentLanguage = 'zh';
    let isNewConversation = true;

    const STORAGE_KEYS = {
        TOKEN: 'jianyan_token',
        AD_CLICKED: 'jianyan_ad_clicked',
        HISTORY: 'jianyan_history',
        SETTINGS: 'jianyan_settings',
        SIGN_DATE: 'jianyan_sign_date',
        QQ_BOUND: 'jianyan_qq_bound',
        QQ_NUMBER: 'jianyan_qq_number'
    };

    // 历史记录数据
    let historyItems = [];
    
    // ---------- DOM 元素 ----------
    const captchaOverlay = document.getElementById('captchaOverlay');
    const captchaMath = document.getElementById('captchaMath');
    const captchaInput = document.getElementById('captchaInput');
    const captchaSubmit = document.getElementById('captchaSubmit');
    const captchaError = document.getElementById('captchaError');
    const mainApp = document.getElementById('mainApp');
    const messagesContainer = document.getElementById('messagesContainer');
    const chatWrapper = document.getElementById('chatWrapper');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const stopBtn = document.getElementById('stopBtn');
    const fileInput = document.getElementById('fileInput');
    const historySidebar = document.getElementById('historySidebar');
    const settingsSidebar = document.getElementById('settingsSidebar');
    const overlay = document.getElementById('overlay');
    const historyToggleBtn = document.getElementById('historyToggleBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const yastDevBtn = document.getElementById('yastDevBtn');
    const githubBtn = document.getElementById('githubBtn');
    const tokenDisplay = document.getElementById('tokenDisplay');
    const adContainer = document.getElementById('adContainer');
    const webSearchBtn = document.getElementById('webSearchBtn');
    const deepSearchBtn = document.getElementById('deepSearchBtn');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const codeThemeSelect = document.getElementById('codeThemeSelect');
    const previewModal = document.getElementById('previewModal');
    const previewBody = document.getElementById('previewBody');
    const resetChatBtn = document.getElementById('resetChatBtn');
    const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
    const signinBtn = document.getElementById('signinBtn');
    const signinStatus = document.getElementById('signinStatus');
    const newChatBtn = document.getElementById('newChatBtn');
    const qqBindBtn = document.getElementById('qqBindBtn');
    const sponserBtn = document.getElementById('sponsorBtn');
    const downloadAndroidBtn = document.getElementById('downloadAndroidBtn');
    const hljsDark = document.getElementById('hljs-dark');
    const hljsLight = document.getElementById('hljs-light');
    const tempSlider = document.getElementById('temperature');
    const tempVal = document.getElementById('tempValue');
    const topPSlider = document.getElementById('topP');
    const topPVal = document.getElementById('topPValue');
    const freqSlider = document.getElementById('freqPenalty');
    const freqVal = document.getElementById('freqValue');
    const presSlider = document.getElementById('presPenalty');
    const presVal = document.getElementById('presValue');
    const maxTokensInput = document.getElementById('maxTokens');
    const seedInput = document.getElementById('seed');
    const streamCheck = document.getElementById('streamOutput');
    const languageSelect = document.getElementById('languageSelect');

    // ---------- 国际化文本 ----------
    const i18n = {
        zh: {
            history: '历史记录', clearHistory: '清空历史', settings: '设置', balance: '余额',
            availableCredit: '可用额度 · 无需注册', signin: '签到', preferences: '偏好设置',
            fontSize: '字体大小', small: '小', medium: '中', large: '大', codeTheme: '代码主题',
            dark: '深色', light: '浅色', language: '语言', conversation: '对话管理', resetChat: '重置聊天数据',
            about: '关于', webSearch: '联网搜索', deepSearch: '深度求索', inputPlaceholder: '输入消息… (Enter发送，Shift+Enter换行)',
            signedToday: '今日已签到', signSuccess: '签到成功 +', signClosed: '签到已关闭',
            copy: '复制', copied: '已复制', searchRef: '搜索参考',
            qqBound: 'QQ已绑定', qqBindSuccess: '绑定成功！赠送300余额', qqInvalid: '请输入正确的QQ号',
            qqAlreadyBound: '该QQ号已被绑定', qqAlreadyBoundLocal: '您已经绑定过QQ了',
            downloadAndroidTitle: '下载安卓版',
            downloadAndroidBtn: '立即下载 Android APK',
            androidHint: '点击安装包即可体验手机版简言'
        },
        en: {
            history: 'History', clearHistory: 'Clear History', settings: 'Settings', balance: 'Balance',
            availableCredit: 'Available · No registration', signin: 'Check-in', preferences: 'Preferences',
            fontSize: 'Font Size', small: 'Small', medium: 'Medium', large: 'Large', codeTheme: 'Code Theme',
            dark: 'Dark', light: 'Light', language: 'Language', conversation: 'Conversation', resetChat: 'Reset Chat',
            about: 'About', webSearch: 'Web Search', deepSearch: 'Deep Search', inputPlaceholder: 'Type a message… (Enter to send)',
            signedToday: 'Checked in today', signSuccess: 'Check-in +', signClosed: 'Check-in closed',
            copy: 'Copy', copied: 'Copied', searchRef: 'Search References',
            qqBound: 'QQ Bound', qqBindSuccess: 'Bind success! +300 balance', qqInvalid: 'Invalid QQ number',
            qqAlreadyBound: 'This QQ is already bound', qqAlreadyBoundLocal: 'You have already bound a QQ',
            downloadAndroidTitle: 'Android App',
            downloadAndroidBtn: 'Download Android APK',
            androidHint: 'Get the mobile version of Jianyan'
        }
    };

    // ---------- 人机验证 ----------
    let correctAnswer = 0;
    function generateCaptcha() {
        const num1 = Math.floor(Math.random() * 20) + 1;
        const num2 = Math.floor(Math.random() * 20) + 1;
        const isAdd = Math.random() > 0.5;
        if (isAdd) {
            correctAnswer = num1 + num2;
            captchaMath.textContent = `${num1} + ${num2} = ?`;
        } else {
            if (num1 >= num2) {
                correctAnswer = num1 - num2;
                captchaMath.textContent = `${num1} - ${num2} = ?`;
            } else {
                correctAnswer = num2 - num1;
                captchaMath.textContent = `${num2} - ${num1} = ?`;
            }
        }
    }
    generateCaptcha();
    
    captchaSubmit.addEventListener('click', () => {
        const userAnswer = parseInt(captchaInput.value.trim(), 10);
        if (userAnswer === correctAnswer) {
            captchaOverlay.style.display = 'none';
            initQueueAndApp();
        } else {
            captchaError.textContent = '答案错误，请重试';
            generateCaptcha();
            captchaInput.value = '';
        }
    });
    captchaInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') captchaSubmit.click();
    });

    // ---------- 排队机制 ----------
    function getOnlineSessions() {
        try {
            const data = localStorage.getItem('jianyan_online_sessions');
            if (!data) return [];
            const sessions = JSON.parse(data);
            const now = Date.now();
            // 清理超过30秒未更新的会话
            return sessions.filter(s => now - s.timestamp < 30000);
        } catch(e) { return []; }
    }
    
    function saveOnlineSessions(sessions) {
        localStorage.setItem('jianyan_online_sessions', JSON.stringify(sessions));
    }
    
    function updateMySession() {
        const sessions = getOnlineSessions();
        const existingIndex = sessions.findIndex(s => s.id === SESSION_ID);
        const now = Date.now();
        if (existingIndex >= 0) {
            sessions[existingIndex].timestamp = now;
        } else {
            sessions.push({ id: SESSION_ID, timestamp: now });
        }
        saveOnlineSessions(sessions);
        return sessions;
    }
    
    function removeMySession() {
        const sessions = getOnlineSessions();
        const filtered = sessions.filter(s => s.id !== SESSION_ID);
        saveOnlineSessions(filtered);
    }
    
    function checkQueueStatus() {
        const sessions = updateMySession();
        const position = sessions.findIndex(s => s.id === SESSION_ID);
        const aheadCount = position; // 前面的人数
        
        if (position < MAX_CONCURRENT) {
            // 可以进入
            clearInterval(queueCheckInterval);
            queueOverlay.style.display = 'none';
            mainApp.style.display = 'flex';
            // 初始化应用界面
            initApp();
        } else {
            // 显示排队信息
            queueOverlay.style.display = 'flex';
            const waitNumber = aheadCount - MAX_CONCURRENT + 1;
            queueNumberSpan.textContent = waitNumber;
            const estimatedTime = waitNumber * 3; // 假设每人3秒
            queueTimeSpan.textContent = estimatedTime;
        }
    }
    
    function startQueuePolling() {
        if (queueCheckInterval) clearInterval(queueCheckInterval);
        queueCheckInterval = setInterval(checkQueueStatus, 2000);
        checkQueueStatus(); // 立即执行一次
    }
    
function initQueueAndApp() {
    mainApp.style.display = 'flex';
    initApp();
}
    



    // ---------- 应用初始化 ----------
    function initApp() {
        loadFromStorage();
        renderAd();
        updateTokenDisplay();
        updateSigninStatus();
        applyLanguage(languageSelect.value);
        fontSizeSelect.dispatchEvent(new Event('change'));
        setupEventListeners();
        renderWelcomeMessage();
    }

    function renderWelcomeMessage() {
        messagesContainer.innerHTML = '';
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'message assistant';
        welcomeDiv.innerHTML = `<div class="bubble">你好，我是 <strong>简言</strong>，由 B站 yast喵~(一水) 基于 Genmini 开发。<br>支持联网搜索、深度求索，可上传多种文件。<br>点击右上角「设置」查看更多功能。</div><div class="message-footer"><button class="copy-message-btn" onclick="window.copyMessageContent(this)"><i class="fa-regular fa-copy"></i> <span data-i18n="copy">${i18n[currentLanguage].copy}</span></button></div>`;
        messagesContainer.appendChild(welcomeDiv);
    }

    // ---------- 存储与设置 ----------
    function loadFromStorage() {
        try {
            const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
            if (savedToken) tokenBalance = parseInt(savedToken, 10);
            
            const savedAd = localStorage.getItem(STORAGE_KEYS.AD_CLICKED);
            if (savedAd) adClicked = savedAd === 'true';
            
            const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
            if (savedHistory) {
                historyItems = JSON.parse(savedHistory);
                renderHistoryList();
            } else {
                initDefaultHistory();
            }
            
            const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                fontSizeSelect.value = settings.fontSize || '16px';
                codeThemeSelect.value = settings.codeTheme || 'dark';
                languageSelect.value = settings.language || 'zh';
                tempSlider.value = settings.temperature || 0.7;
                topPSlider.value = settings.topP || 0.95;
                freqSlider.value = settings.freqPenalty || 0;
                presSlider.value = settings.presPenalty || 0;
                maxTokensInput.value = settings.maxTokens || 4096;
                seedInput.value = settings.seed || '';
                streamCheck.checked = settings.streamOutput !== false;
                updateSliderDisplays();
                updateCodeTheme();
            }
        } catch(e) { console.warn('读取存储失败', e); }
    }

    function saveSettings() {
        const settings = {
            fontSize: fontSizeSelect.value,
            codeTheme: codeThemeSelect.value,
            language: languageSelect.value,
            temperature: tempSlider.value,
            topP: topPSlider.value,
            freqPenalty: freqSlider.value,
            presPenalty: presSlider.value,
            maxTokens: maxTokensInput.value,
            seed: seedInput.value,
            streamOutput: streamCheck.checked
        };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    function saveTokenBalance() {
        localStorage.setItem(STORAGE_KEYS.TOKEN, tokenBalance);
    }

    function saveAdClicked() {
        localStorage.setItem(STORAGE_KEYS.AD_CLICKED, adClicked);
    }

    function saveHistoryList() {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyItems));
    }

    // ---------- 历史记录（修复版：保存完整对话上下文）----------
    function initDefaultHistory() {
        historyItems = [
            { 
                title: '你好，介绍一下简言', 
                messages: [
                    { role: 'user', content: '你好，介绍一下简言' },
                    { role: 'assistant', content: '你好！我是简言，一个由B站yast喵~开发的智能助手。我可以回答问题、提供建议、编写代码等。有什么可以帮你的吗？' }
                ]
            },
            { 
                title: '用Python写一个快速排序', 
                messages: [
                    { role: 'user', content: '用Python写一个快速排序' },
                    { role: 'assistant', content: '这是Python实现的快速排序：\n```python\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr)//2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n```' }
                ]
            },
            { 
                title: '生成一个员工表(姓名,年龄,部门)', 
                messages: [
                    { role: 'user', content: '生成一个员工表(姓名,年龄,部门)' },
                    { role: 'assistant', content: '| 姓名 | 年龄 | 部门 |\n|------|------|------|\n| 张三 | 28 | 技术部 |\n| 李四 | 32 | 市场部 |\n| 王五 | 25 | 设计部 |' }
                ]
            }
        ];
        saveHistoryList();
        renderHistoryList();
    }

    function renderHistoryList() {
        const container = document.getElementById('historyListContainer');
        container.innerHTML = '';
        historyItems.slice().reverse().forEach(item => {
            addHistoryItemToDom(item.title, item);
        });
    }

    function addHistoryItemToDom(title, historyItem) {
        const container = document.getElementById('historyListContainer');
        const div = document.createElement('div');
        div.className = 'history-item';
        div.setAttribute('data-title', title);
        div.innerHTML = `<i class="fa-regular fa-message"></i> ${title}<span class="delete-history" onclick="window.deleteHistoryItem(event, this)"><i class="fa-regular fa-trash-can"></i></span>`;
        div.addEventListener('click', (e) => {
            // 防止点击删除按钮时触发
            if (e.target.closest('.delete-history')) return;
            restoreHistoryFromItem(historyItem);
        });
        container.prepend(div);
    }

    // 保存新历史（包含完整对话上下文）
    function addHistoryItemWithContext(title, userMessage, assistantReply) {
        // 构建当前对话的消息数组（不包含系统提示词）
        const messages = conversationMessages.slice(1); // 去除 system
        const historyItem = {
            title: title,
            messages: messages
        };
        historyItems.push(historyItem);
        addHistoryItemToDom(title, historyItem);
        saveHistoryList();
    }

    // 恢复历史对话
    function restoreHistoryFromItem(historyItem) {
        // 重置对话状态
        conversationMessages = [conversationMessages[0]]; // 保留系统提示词
        // 追加历史消息
        conversationMessages.push(...historyItem.messages);
        // 重新渲染聊天界面
        renderConversationFromMessages();
        closeAllSidebars();
    }

    function renderConversationFromMessages() {
        messagesContainer.innerHTML = '';
        const messagesToRender = conversationMessages.slice(1); // 跳过system
        messagesToRender.forEach(msg => {
            appendMessage(msg.role, msg.content);
        });
        scrollToBottom();
    }

    window.deleteHistoryItem = function(event, el) {
        event.stopPropagation();
        const itemDiv = el.closest('.history-item');
        const title = itemDiv.getAttribute('data-title');
        historyItems = historyItems.filter(item => item.title !== title);
        itemDiv.remove();
        saveHistoryList();
    };

    // ---------- UI 辅助函数 ----------
    function updateSliderDisplays() {
        tempVal.textContent = tempSlider.value;
        topPVal.textContent = topPSlider.value;
        freqVal.textContent = freqSlider.value;
        presVal.textContent = presSlider.value;
    }

    function applyLanguage(lang) {
        currentLanguage = lang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[lang] && i18n[lang][key]) el.textContent = i18n[lang][key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (i18n[lang] && i18n[lang][key]) el.placeholder = i18n[lang][key];
        });
        fontSizeSelect.options[0].text = i18n[lang].small;
        fontSizeSelect.options[1].text = i18n[lang].medium;
        fontSizeSelect.options[2].text = i18n[lang].large;
        codeThemeSelect.options[0].text = i18n[lang].dark;
        codeThemeSelect.options[1].text = i18n[lang].light;
        updateSigninStatus();
    }

    function updateCodeTheme() {
        const theme = codeThemeSelect.value;
        if (theme === 'dark') {
            hljsDark.disabled = false;
            hljsLight.disabled = true;
        } else {
            hljsDark.disabled = true;
            hljsLight.disabled = false;
        }
    }

    function updateTokenDisplay() {
        const balanceInYuan = (tokenBalance / 10000).toFixed(2);
        tokenDisplay.textContent = '¥' + parseFloat(balanceInYuan).toLocaleString();
        saveTokenBalance();
    }

    function updateSigninStatus() {
        const lastSign = localStorage.getItem(STORAGE_KEYS.SIGN_DATE);
        const today = new Date().toDateString();
        if (lastSign === today) {
            signinBtn.disabled = true;
            signinStatus.textContent = i18n[currentLanguage].signedToday;
        } else {
            signinBtn.disabled = false;
            signinStatus.textContent = '';
        }
    }

    function renderAd() {
        if (adClicked) { adContainer.innerHTML = ''; return; }
        adContainer.innerHTML = `
            <div class="ad-card">
                <span class="ad-text"><i class="fa-solid fa-gift" style="margin-right:6px;"></i>新人免费领500余额</span>
                <button class="ad-btn" id="claimAdBtn"><i class="fa-solid fa-arrow-right"></i> 立即领取</button>
            </div>
        `;
        document.getElementById('claimAdBtn').addEventListener('click', (e) => {
            e.preventDefault();
            window.open('https://api.gemai.cc/register?aff=fvs5', '_blank');
            adClicked = true;
            tokenBalance += 5000000;
            updateTokenDisplay();
            saveAdClicked();
            renderAd();
        });
    }

    function scrollToBottom() {
        setTimeout(() => chatWrapper.scrollTo({ top: chatWrapper.scrollHeight, behavior: 'smooth' }), 50);
    }

    function closeAllSidebars() {
        historySidebar.classList.remove('open');
        settingsSidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    // ---------- 消息渲染与交互 ----------
    function appendMessage(role, content, attachment = null) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        if (role === 'user') {
            bubble.textContent = content;
            div.appendChild(bubble);
            if (attachment) {
                const attEl = document.createElement('div');
                attEl.className = 'file-attachment';
                const ext = attachment.name.split('.').pop().toLowerCase();
                let icon = 'fa-file-lines';
                if (['jpg','jpeg','png','gif','webp'].includes(ext)) icon = 'fa-file-image';
                else if (['pdf'].includes(ext)) icon = 'fa-file-pdf';
                else if (['doc','docx'].includes(ext)) icon = 'fa-file-word';
                else if (['xls','xlsx','csv'].includes(ext)) icon = 'fa-file-excel';
                else if (['txt','md'].includes(ext)) icon = 'fa-file-alt';
                attEl.innerHTML = `<i class="fa-regular ${icon}"></i> ${attachment.name}`;
                div.appendChild(attEl);
            }
        } else {
            bubble.innerHTML = renderMarkdownWithFeatures(content);
            div.appendChild(bubble);
        }
        
        const footer = document.createElement('div');
        footer.className = 'message-footer';
        footer.innerHTML = `<button class="copy-message-btn" onclick="window.copyMessageContent(this)"><i class="fa-regular fa-copy"></i> <span data-i18n="copy">${i18n[currentLanguage].copy}</span></button>`;
        div.appendChild(footer);
        
        messagesContainer.appendChild(div);
        scrollToBottom();
        return div;
    }

    window.copyMessageContent = function(btn) {
        const messageDiv = btn.closest('.message');
        const bubble = messageDiv.querySelector('.bubble');
        const textToCopy = bubble.innerText || bubble.textContent;
        navigator.clipboard?.writeText(textToCopy).then(() => {
            const span = btn.querySelector('span');
            const originalText = span.textContent;
            span.textContent = i18n[currentLanguage].copied;
            setTimeout(() => span.textContent = originalText, 1500);
        }).catch(() => alert('复制失败'));
    };

    // Markdown 渲染及代码块功能
    function renderMarkdownWithFeatures(text) {
        if (!text) return '';
        let html = marked.parse(text);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
        attachCodeBlockFeatures(tempDiv);
        return tempDiv.innerHTML;
    }

    function attachCodeBlockFeatures(container) {
        container.querySelectorAll('pre').forEach((pre) => {
            if (pre.parentNode.querySelector('.code-block-header')) return;
            const code = pre.querySelector('code');
            const codeText = code ? code.textContent : pre.textContent;
            const lang = code && code.className ? code.className.replace('language-', '') : 'text';
            const headerDiv = document.createElement('div');
            headerDiv.className = 'code-block-header';
            headerDiv.innerHTML = `
                <button class="code-btn copy-code"><i class="fa-regular fa-copy"></i> ${i18n[currentLanguage].copy}</button>
                <button class="code-btn preview-code"><i class="fa-regular fa-eye"></i> 预览</button>
                <button class="code-btn download-code"><i class="fa-solid fa-download"></i> 下载</button>
            `;
            pre.parentNode.insertBefore(headerDiv, pre);
            headerDiv.querySelector('.copy-code').addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(codeText).then(() => alert(i18n[currentLanguage].copied)).catch(() => alert('复制失败'));
            });
            headerDiv.querySelector('.preview-code').addEventListener('click', (e) => {
                e.stopPropagation();
                showPreview(codeText, lang);
            });
            headerDiv.querySelector('.download-code').addEventListener('click', (e) => {
                e.stopPropagation();
                const blob = new Blob([codeText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `code.${lang || 'txt'}`;
                a.click();
                URL.revokeObjectURL(url);
            });
        });
    }

    function showPreview(content, type) {
        previewBody.innerHTML = '';
        if (type === 'html') {
            const iframe = document.createElement('iframe');
            iframe.style.width = '100%'; iframe.style.height = '400px'; iframe.style.border = 'none';
            iframe.srcdoc = content;
            previewBody.appendChild(iframe);
        } else {
            previewBody.innerHTML = `<pre><code>${escapeHtml(content)}</code></pre>`;
            hljs.highlightElement(previewBody.querySelector('code'));
        }
        previewModal.classList.add('show');
    }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.closePreview = () => previewModal.classList.remove('show');

    // 打字指示器
    function addTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'message assistant';
        div.id = 'typingIndicator';
        div.innerHTML = '<div class="bubble"><div class="typing-indicator"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></div>';
        messagesContainer.appendChild(div);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        document.getElementById('typingIndicator')?.remove();
    }

    // ---------- API 通信 ----------
    async function generateTitleWithAI(userMessage, aiResponse) {
        try {
            const res = await fetch(`${API_BASE}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
                body: JSON.stringify({
                    model: MODEL_OPTIONS[0],
                    messages: [{ role: 'user', content: `用不超过10个字概括以下对话的主题：用户说“${userMessage}”，AI回复了“${aiResponse.substring(0, 100)}”。只返回标题文本。` }],
                    max_tokens: 20,
                    temperature: 0.5
                })
            });
            const data = await res.json();
            return data.choices[0].message.content.trim();
        } catch (e) {
            return (userMessage + ' ' + aiResponse).substring(0, 20);
        }
    }

    async function trySendWithModel(content) {
        for (let i = currentModelIndex; i < MODEL_OPTIONS.length; i++) {
            const model = MODEL_OPTIONS[i];
            try {
                const params = {
                    model, messages: conversationMessages,
                    temperature: parseFloat(tempSlider.value),
                    top_p: parseFloat(topPSlider.value),
                    frequency_penalty: parseFloat(freqSlider.value),
                    presence_penalty: parseFloat(presSlider.value),
                    max_tokens: parseInt(maxTokensInput.value) || 4096,
                    stream: streamCheck.checked,
                    ...(webSearchEnabled && { web_search: true }),
                    ...(deepSearchEnabled && { deep_search: true })
                };
                const seedVal = seedInput.value.trim();
                if (seedVal) params.seed = parseInt(seedVal);
                
                const response = await fetch(`${API_BASE}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
                    body: JSON.stringify(params),
                    signal: currentController.signal
                });
                if (response.ok) { currentModelIndex = i; return response; }
                const errText = await response.text();
                if (response.status !== 403 || !errText.includes('无权访问模型')) throw new Error(`API ${response.status}: ${errText}`);
            } catch (e) {
                if (i === MODEL_OPTIONS.length - 1) throw e;
            }
        }
        throw new Error('所有模型尝试均失败');
    }

    async function handleSend() {
        const content = userInput.value.trim();
        if (!content || isLoading) return;
        if (currentController) currentController.abort();
        
        const file = fileInput.files[0];
        let userContent = content;
        if (file) userContent = `[文件: ${file.name}]\n${content}`;
        
        appendMessage('user', content, file);
        conversationMessages.push({ role: 'user', content: userContent });
        const userMessageForTitle = content;
        
        userInput.value = ''; userInput.style.height = 'auto'; fileInput.value = '';
        isLoading = true; 
        sendBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        addTypingIndicator();
        currentController = new AbortController();
        
        try {
            const response = await trySendWithModel(content);
            removeTypingIndicator();
            
            const assistantDiv = document.createElement('div');
            assistantDiv.className = 'message assistant';
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            assistantDiv.appendChild(bubble);
            const footer = document.createElement('div');
            footer.className = 'message-footer';
            footer.innerHTML = `<button class="copy-message-btn" onclick="window.copyMessageContent(this)"><i class="fa-regular fa-copy"></i> <span data-i18n="copy">${i18n[currentLanguage].copy}</span></button>`;
            assistantDiv.appendChild(footer);
            messagesContainer.appendChild(assistantDiv);
            
            if (!streamCheck.checked) {
                const data = await response.json();
                const reply = data.choices[0].message.content;
                bubble.innerHTML = renderMarkdownWithFeatures(reply);
                conversationMessages.push({ role: 'assistant', content: reply });
                tokenBalance = Math.max(0, tokenBalance - Math.floor(reply.length / 2 + 50));
                updateTokenDisplay();
                if (isNewConversation) {
                    const title = await generateTitleWithAI(userMessageForTitle, reply);
                    addHistoryItemWithContext(title, userMessageForTitle, reply);
                    isNewConversation = false;
                }
                return;
            }
            
            // 流式输出
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let full = '', buffer = '', thinkText = '';
            let searchRefs = [];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n'); buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(line.slice(6));
                            const delta = json.choices?.[0]?.delta;
                            if (delta) {
                                if (delta.reasoning_content) thinkText += delta.reasoning_content;
                                if (delta.content) full += delta.content;
                                if (json.search_info?.results) searchRefs = json.search_info.results;
                                let bubbleHtml = '';
                                if (searchRefs.length) bubbleHtml += `<div class="search-refs"><strong>${i18n[currentLanguage].searchRef}:</strong><br>` + searchRefs.map(ref => `<a href="${ref.url}" target="_blank">${ref.title}</a>`).join('') + `</div>`;
                                if (thinkText) bubbleHtml += `<div class="think-block">${thinkText}</div>`;
                                bubbleHtml += renderMarkdownWithFeatures(full);
                                bubble.innerHTML = bubbleHtml;
                                scrollToBottom();
                            }
                        } catch(e) {}
                    }
                }
            }
            if (full) {
                conversationMessages.push({ role: 'assistant', content: full });
                if (isNewConversation) {
                    const title = await generateTitleWithAI(userMessageForTitle, full);
                    addHistoryItemWithContext(title, userMessageForTitle, full);
                    isNewConversation = false;
                }
            } else bubble.innerHTML = '_(未返回内容)_';
            tokenBalance = Math.max(0, tokenBalance - Math.floor(full.length / 2 + 50));
            updateTokenDisplay();
        } catch (e) {
            removeTypingIndicator();
            if (e.name !== 'AbortError') appendMessage('assistant', `请求失败: ${e.message}`);
        } finally {
            isLoading = false; 
            sendBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'none';
            currentController = null;
        }
    }

    function stopGeneration() {
        if (currentController) { currentController.abort(); currentController = null; }
        isLoading = false;
        sendBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
        removeTypingIndicator();
    }

    function resetChat() {
        conversationMessages = [conversationMessages[0]];
        renderWelcomeMessage();
        isNewConversation = true;
    }

    function clearHistoryList() {
        historyItems = [];
        document.getElementById('historyListContainer').innerHTML = '';
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
        initDefaultHistory();
    }

    // ---------- 事件绑定 ----------
    function setupEventListeners() {
        // 滑块与输入
        tempSlider.addEventListener('input', () => { tempVal.textContent = tempSlider.value; saveSettings(); });
        topPSlider.addEventListener('input', () => { topPVal.textContent = topPSlider.value; saveSettings(); });
        freqSlider.addEventListener('input', () => { freqVal.textContent = freqSlider.value; saveSettings(); });
        presSlider.addEventListener('input', () => { presVal.textContent = presSlider.value; saveSettings(); });
        maxTokensInput.addEventListener('change', saveSettings);
        seedInput.addEventListener('change', saveSettings);
        streamCheck.addEventListener('change', saveSettings);
        
        fontSizeSelect.addEventListener('change', (e) => {
            document.querySelectorAll('.bubble').forEach(el => el.style.fontSize = e.target.value);
            saveSettings();
        });
        codeThemeSelect.addEventListener('change', () => { updateCodeTheme(); saveSettings(); });
        languageSelect.addEventListener('change', (e) => {
            applyLanguage(e.target.value);
            saveSettings();
        });

        // 按钮
        sendBtn.addEventListener('click', handleSend);
        stopBtn.addEventListener('click', stopGeneration);
        newChatBtn.addEventListener('click', resetChat);
        
        historyToggleBtn.addEventListener('click', () => {
            settingsSidebar.classList.remove('open');
            historySidebar.classList.add('open');
            overlay.classList.add('show');
        });
        closeHistoryBtn.addEventListener('click', closeAllSidebars);
        openSettingsBtn.addEventListener('click', () => {
            historySidebar.classList.remove('open');
            settingsSidebar.classList.add('open');
            overlay.classList.add('show');
        });
        closeSettingsBtn.addEventListener('click', closeAllSidebars);
        overlay.addEventListener('click', closeAllSidebars);
        
        yastDevBtn.addEventListener('click', () => window.open('https://space.bilibili.com/3546774769765189', '_blank'));
        githubBtn.addEventListener('click', () => window.open('https://github.com/yast-code426/JianYan', '_blank'));
        downloadAndroidBtn.addEventListener('click', () => window.open('https://link.jiyiho.cn/orfile/down.php/f369e69c3605332a7943691696662656.apk', '_blank'));
        
        resetChatBtn.addEventListener('click', resetChat);
        clearAllHistoryBtn.addEventListener('click', clearHistoryList);
        
        webSearchBtn.addEventListener('click', () => {
            webSearchEnabled = !webSearchEnabled;
            webSearchBtn.classList.toggle('active', webSearchEnabled);
        });
        deepSearchBtn.addEventListener('click', () => {
            deepSearchEnabled = !deepSearchEnabled;
            deepSearchBtn.classList.toggle('active', deepSearchEnabled);
        });
        
        signinBtn.addEventListener('click', () => {
            const lastSign = localStorage.getItem(STORAGE_KEYS.SIGN_DATE);
            const today = new Date().toDateString();
            if (lastSign === today) return;
            const reward = Math.floor(Math.random() * 91) + 10;
            tokenBalance += reward * 10000;
            updateTokenDisplay();
            localStorage.setItem(STORAGE_KEYS.SIGN_DATE, today);
            signinBtn.disabled = true;
            signinStatus.textContent = i18n[currentLanguage].signSuccess + reward;
            setTimeout(() => signinStatus.textContent = i18n[currentLanguage].signedToday, 2000);
        });

        qqBindBtn.addEventListener('click', () => {
            const boundQQ = localStorage.getItem(STORAGE_KEYS.QQ_NUMBER);
            if (boundQQ) {
                alert(i18n[currentLanguage].qqAlreadyBoundLocal);
                return;
            }
            const qq = prompt('请输入您的QQ号码（仅能绑定一次，绑定后赠送300余额）:');
            if (!qq) return;
            if (!/^\d{5,11}$/.test(qq)) {
                alert(i18n[currentLanguage].qqInvalid);
                return;
            }
            const usedQQs = JSON.parse(localStorage.getItem('used_qq_list') || '[]');
            if (usedQQs.includes(qq)) {
                alert(i18n[currentLanguage].qqAlreadyBound);
                return;
            }
            usedQQs.push(qq);
            localStorage.setItem('used_qq_list', JSON.stringify(usedQQs));
            localStorage.setItem(STORAGE_KEYS.QQ_NUMBER, qq);
            localStorage.setItem(STORAGE_KEYS.QQ_BOUND, 'true');
            tokenBalance += 300 * 10000;
            updateTokenDisplay();
            alert(i18n[currentLanguage].qqBindSuccess);
        });

        sponserBtn.addEventListener('click', () => {
            window.open('https://ifdian.net/a/yastmiao', '_blank');
        });

        userInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
        });
        userInput.addEventListener('input', () => {
            userInput.style.height = 'auto';
            userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
        });
    }

    // 标记全局函数以供HTML内联调用
    window.copyMessageContent = copyMessageContent;
    window.deleteHistoryItem = deleteHistoryItem;
    window.closePreview = closePreview;

    // 初始化marked配置
    marked.setOptions({ breaks: true, gfm: true });

})();
