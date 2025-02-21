import type { ChatOptions } from '@n8n/chat/types';

export const defaultOptions: ChatOptions = {
	webhookUrl: 'http://localhost:5678',
	webhookConfig: {
		method: 'POST',
		headers: {},
	},
	target: '#n8n-chat',
	mode: 'window',
	loadPreviousSession: true,
	chatInputKey: 'chatInput',
	chatSessionKey: 'sessionId',
	defaultLanguage: 'en',
	showWelcomeScreen: false,
	initialMessages: ['Hallo! 👋', 'Ich bin Dolorez. Wie kann ich Ihnen heute weiterhelfen?'],
	i18n: {
		en: {
			title: 'Hey! 👋',
			subtitle: "Herzlich willkommen im Dolomitenhotel! 🌄👋",
			footer: '',
			getStarted: 'Starten Sie eine Unterhaltung',
			inputPlaceholder: 'Geben Sie Ihre Frage ein..',
			closeButtonTooltip: 'Chat schließen',
		},
	},
	theme: {},
};

export const defaultMountingTarget = '#n8n-chat';
