import type { ChatbotOptions } from '@/types';

export const defaultOptions: ChatbotOptions = {
	webhookUrl: 'http://localhost:5678',
	target: '#n8n-chatbot',
	mode: 'window',
	defaultLanguage: 'en',
	initialMessages: ['Hi there! 👋', 'My name is Nathan. How can I assist you today?'],
	i18n: {
		en: {
			title: 'Hi there! 👋',
			subtitle: "Start a chat. We're here to help you 24/7.",
			footer: '',
			getStarted: 'New Conversation',
			inputPlaceholder: 'Type your question..',
		},
	},
	theme: {},
	poweredBy: true,
};

export const defaultMountingTarget = '#n8n-chatbot';
