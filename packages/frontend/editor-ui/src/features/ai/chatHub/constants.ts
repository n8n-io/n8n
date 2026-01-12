import type { ChatHubLLMProvider, ChatHubProvider } from '@n8n/api-types';

// Route and view identifiers
export const CHAT_VIEW = 'chat';
export const CHAT_CONVERSATION_VIEW = 'chat-conversation';
export const CHAT_WORKFLOW_AGENTS_VIEW = 'chat-workflow-agents';
export const CHAT_PERSONAL_AGENTS_VIEW = 'chat-personal-agents';
export const CHAT_SETTINGS_VIEW = 'chat-settings';

export const CHAT_STORE = 'chatStore';
export const CHAT_SESSIONS_PAGE_SIZE = 18;
export const MAX_AGENT_NAME_CHARS_MENU = 45;
export const NEW_AGENT_MENU_ID = 'agent::new';
export const MAX_AGENT_NAME_CHARS = 30;
export const MAX_FLATTENED_SEARCH_RESULTS_PER_PROVIDER = 10;

export const providerDisplayNames: Record<ChatHubProvider, string> = {
	openai: 'OpenAI',
	anthropic: 'Anthropic',
	google: 'Google',
	azureOpenAi: 'Azure (API Key)',
	azureEntraId: 'Azure (Entra ID)',
	ollama: 'Ollama',
	awsBedrock: 'AWS Bedrock',
	vercelAiGateway: 'Vercel AI Gateway',
	xAiGrok: 'xAI Grok',
	groq: 'Groq',
	openRouter: 'OpenRouter',
	deepSeek: 'DeepSeek',
	cohere: 'Cohere',
	mistralCloud: 'Mistral Cloud',
	n8n: 'Workflow agent',
	'custom-agent': 'Personal agent',
};

export const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

export const TOOLS_SELECTOR_MODAL_KEY = 'toolsSelectorModal';
export const AGENT_EDITOR_MODAL_KEY = 'agentEditorModal';
export const CHAT_CREDENTIAL_SELECTOR_MODAL_KEY = 'chatCredentialSelectorModal';
export const CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY = 'chatModelByIdSelectorModal';
export const CHAT_PROVIDER_SETTINGS_MODAL_KEY = 'chatProviderSettingsModal';

export const LLM_AGGREGATORS: ChatHubLLMProvider[] = [
	'awsBedrock',
	'vercelAiGateway',
	'openRouter',
];
