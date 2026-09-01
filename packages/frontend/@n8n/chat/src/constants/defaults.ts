import MessageWithButtons from '@n8n/chat/components/MessageWithButtons.vue';
import { MessageComponentKey } from '@n8n/chat/constants/messageComponents';
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
	initialMessages: ['Hi there! 👋', 'My name is Nathan. How can I assist you today?'],
	i18n: {
		en: {
			title: 'Hi there! 👋',
			subtitle: "Start a chat. We're here to help you 24/7.",
			footer: '',
			getStarted: 'New Conversation',
			inputPlaceholder: 'Type your question..',
			closeButtonTooltip: 'Close chat',
			repostButton: 'Repost message',
			reuseButton: 'Reuse message',
			credentialStatusMissingAccount: 'Connect 1 account to start chatting',
			credentialStatusMissingAccounts: 'Connect {count} accounts to start chatting',
			credentialStatusTestMode:
				"You're testing with your own connected accounts. Visitors will need to connect their own.",
		},
	},
	theme: {},
	enableStreaming: false,
	messageComponents: {
		[MessageComponentKey.WITH_BUTTONS]: MessageWithButtons,
	},
};

export const defaultMountingTarget = '#n8n-chat';
