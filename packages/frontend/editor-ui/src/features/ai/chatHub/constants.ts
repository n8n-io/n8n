import type { ChatHubProvider } from '@n8n/api-types';

// Route and view identifiers
export const CHAT_VIEW = 'chat';
export const CHAT_CONVERSATION_VIEW = 'chat-conversation';
export const CHAT_AGENTS_VIEW = 'chat-agents';

export const CHAT_STORE = 'chatStore';

export const providerDisplayNames: Record<ChatHubProvider, string> = {
	openai: 'OpenAI',
	anthropic: 'Anthropic',
	google: 'Google',
	n8n: 'n8n',
	'custom-agent': 'Custom Agent',
};

export const MOBILE_MEDIA_QUERY = '(max-width: 768px)';
