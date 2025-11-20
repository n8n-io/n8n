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
	azureOpenAi: 'Azure OpenAI',
	ollama: 'Ollama',
	awsBedrock: 'AWS Bedrock',
	cohere: 'Cohere',
	mistralCloud: 'Mistral Cloud',
	n8n: 'n8n',
	'custom-agent': 'Custom Agent',
};

export const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

export const TOOLS_SELECTOR_MODAL_KEY = 'toolsSelectorModal';
export const AGENT_EDITOR_MODAL_KEY = 'agentEditorModal';
export const CHAT_CREDENTIAL_SELECTOR_MODAL_KEY = 'chatCredentialSelectorModal';
export const CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY = 'chatModelByIdSelectorModal';
