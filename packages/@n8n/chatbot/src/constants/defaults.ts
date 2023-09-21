import type { ChatbotOptions } from '@/types';

export const defaultOptions: ChatbotOptions = {
	webhookUrl: 'http://localhost:5678',
	target: '#n8n-chatbot',
	mode: 'window',
	defaultLanguage: 'en',
	messages: {
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
