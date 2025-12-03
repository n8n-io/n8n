import type { ChatHubLLMProvider, ChatModelMetadataDto } from '@n8n/api-types';
import type { INodeTypeNameVersion } from 'n8n-workflow';

export const CONVERSATION_TITLE_GENERATION_PROMPT = `Generate a concise, descriptive title for this conversation based on the user's message.

Requirements:
- 2 to 5 words
- Use normal sentence case (not title case)
- No quotation marks
- Only output the title, nothing else
- Use the same language as the user's message
`;

export const PROVIDER_NODE_TYPE_MAP: Record<ChatHubLLMProvider, INodeTypeNameVersion> = {
	openai: {
		name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		version: 1.3,
	},
	anthropic: {
		name: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		version: 1.3,
	},
	google: {
		name: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
		version: 1.2,
	},
	ollama: {
		name: '@n8n/n8n-nodes-langchain.lmOllama',
		version: 1,
	},
	azureOpenAi: {
		name: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
		version: 1,
	},
	azureEntraId: {
		name: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
		version: 1,
	},
	awsBedrock: {
		name: '@n8n/n8n-nodes-langchain.lmChatAwsBedrock',
		version: 1.1,
	},
	vercelAiGateway: {
		name: '@n8n/n8n-nodes-langchain.lmChatVercelAiGateway',
		version: 1,
	},
	xAiGrok: {
		name: '@n8n/n8n-nodes-langchain.lmChatXAiGrok',
		version: 1,
	},
	groq: {
		name: '@n8n/n8n-nodes-langchain.lmChatGroq',
		version: 1,
	},
	openRouter: {
		name: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
		version: 1,
	},
	deepSeek: {
		name: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
		version: 1,
	},
	cohere: {
		name: '@n8n/n8n-nodes-langchain.lmChatCohere',
		version: 1,
	},
	mistralCloud: {
		name: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
		version: 1,
	},
};

export const NODE_NAMES = {
	CHAT_TRIGGER: 'When chat message received',
	REPLY_AGENT: 'AI Agent',
	TITLE_GENERATOR_AGENT: 'Title Generator Agent',
	CHAT_MODEL: 'Chat Model',
	MEMORY: 'Memory',
	RESTORE_CHAT_MEMORY: 'Restore Chat Memory',
	CLEAR_CHAT_MEMORY: 'Clear Chat Memory',
	MERGE: 'Merge',
} as const;

/* eslint-disable @typescript-eslint/naming-convention */
export const JSONL_STREAM_HEADERS = {
	'Content-Type': 'application/json-lines; charset=utf-8',
	'Transfer-Encoding': 'chunked',
	'Cache-Control': 'no-cache',
	Connection: 'keep-alive',
};
/* eslint-enable @typescript-eslint/naming-convention */

// Default metadata for all models
const DEFAULT_MODEL_METADATA: ChatModelMetadataDto = {
	inputModalities: ['text', 'image', 'audio', 'video', 'file'],
	capabilities: {
		functionCalling: true,
	},
};

const MODEL_METADATA_REGISTRY: Partial<
	Record<ChatHubLLMProvider, Partial<Record<string, Partial<ChatModelMetadataDto>>>>
> = {
	anthropic: {
		'claude-3-5-haiku-20241022': {
			inputModalities: ['text', 'image'],
		},
		'claude-3-haiku-20240307': {
			inputModalities: ['text', 'image'],
		},
		'claude-3-opus-20240229': {
			inputModalities: ['text', 'image'],
		},
		'claude-3-sonnet-20240229': {
			inputModalities: ['text', 'image'],
		},
		'claude-3-5-sonnet-20241022': {
			inputModalities: ['text', 'image'],
		},
		'claude-3-7-sonnet-20250219': {
			inputModalities: ['text', 'image'],
		},
		'claude-sonnet-4-20250514': {
			inputModalities: ['text', 'image'],
		},
		'claude-sonnet-4-5-20250929': {
			inputModalities: ['text', 'image'],
		},
		'claude-haiku-4-5-20251001': {
			inputModalities: ['text', 'image'],
		},
		'claude-opus-4-20250514': {
			inputModalities: ['text', 'image'],
		},
		'claude-opus-4-1-20250805': {
			inputModalities: ['text', 'image'],
		},
	},
	openai: {
		'gpt-4o-mini-search-preview': {
			inputModalities: ['text'],
			capabilities: {
				functionCalling: false,
			},
		},
		'gpt-4o-mini-search-preview-2025-03-11': {
			inputModalities: ['text'],
			capabilities: {
				functionCalling: false,
			},
		},
		'gpt-4o-search-preview': {
			inputModalities: ['text'],
			capabilities: {
				functionCalling: false,
			},
		},
		'gpt-4o-search-preview-2025-03-11': {
			inputModalities: ['text'],
			capabilities: {
				functionCalling: false,
			},
		},
		'gpt-3.5-turbo': {
			inputModalities: ['text'],
		},
		'gpt-4': {
			inputModalities: ['text'],
		},
		'gpt-4-turbo': {
			inputModalities: ['text', 'image'],
		},
		'o1-mini': {
			inputModalities: ['text'],
		},
		'o1-mini-2024-09-12': {
			inputModalities: ['text'],
		},
		o1: {
			inputModalities: ['text'],
		},
		'o1-pro': {
			inputModalities: ['text'],
		},
		'o1-pro-2025-03-19': {
			inputModalities: ['text'],
		},
		'o3-mini': {
			inputModalities: ['text'],
		},
		'o4-mini': {
			inputModalities: ['text'],
		},
		'o4-mini-2025-04-16': {
			inputModalities: ['text'],
		},
		'o4-mini-high': {
			inputModalities: ['text'],
		},
		o3: {
			inputModalities: ['text'],
		},
		'o3-2025-04-16': {
			inputModalities: ['text'],
		},
		'o3-pro': {
			inputModalities: ['text'],
		},
		'o3-pro-2025-06-10': {
			inputModalities: ['text'],
		},
	},
	mistralCloud: {
		// Most Mistral models support text and image
		'mistral-tiny-2312': {
			inputModalities: ['text'],
		},
		'mistral-tiny-2407': {
			inputModalities: ['text'],
		},
		'mistral-tiny-latest': {
			inputModalities: ['text'],
		},
		'mistral-tiny': {
			inputModalities: ['text'],
		},
		'mistral-small-2312': {
			inputModalities: ['text'],
		},
		'mistral-small-2409': {
			inputModalities: ['text'],
		},
		'mistral-small-2501': {
			inputModalities: ['text'],
		},
		'mistral-small-2503': {
			inputModalities: ['text'],
		},
		'mistral-small-2506': {
			inputModalities: ['text'],
		},
		'mistral-small-latest': {
			inputModalities: ['text'],
		},
		'open-mistral-7b': {
			inputModalities: ['text'],
		},
		'open-mistral-nemo': {
			inputModalities: ['text'],
		},
		'open-mistral-nemo-2407': {
			inputModalities: ['text'],
		},
		'open-mixtral-8x7b': {
			inputModalities: ['text'],
		},
		'open-mixtral-8x22b': {
			inputModalities: ['text'],
		},
		'open-mixtral-8x22b-2404': {
			inputModalities: ['text'],
		},
		'ministral-3b-2410': {
			inputModalities: ['text'],
		},
		'ministral-3b-latest': {
			inputModalities: ['text'],
		},
		'ministral-8b-2410': {
			inputModalities: ['text'],
		},
		'ministral-8b-latest': {
			inputModalities: ['text'],
		},
	},
	// Reference: https://ai.google.dev/gemini-api/docs/models
	google: {
		// Gemini 3 series - latest models with advanced multimodal understanding
		'models/gemini-3-pro-preview': {},
		'models/gemini-3-pro-image-preview': {
			inputModalities: ['text', 'image'],
			capabilities: { functionCalling: false },
		},
		// Gemini 2.5 Pro series
		'models/gemini-2.5-pro': {},
		'models/gemini-2.5-pro-exp-03-25': {},
		'models/gemini-2.5-pro-preview-03-25': {},
		'models/gemini-2.5-pro-preview-05-06': {},
		'models/gemini-2.5-pro-preview-06-05': {},
		'models/gemini-2.5-pro-preview-tts': {
			inputModalities: ['text'],
			capabilities: { functionCalling: false },
		},
		// Gemini 2.5 Flash series
		'models/gemini-2.5-flash': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.5-flash-preview-04-17': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.5-flash-preview-05-20': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.5-flash-preview-09-2025': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.5-flash-preview-tts': {
			inputModalities: ['text'],
			capabilities: { functionCalling: false },
		},
		'models/gemini-2.5-flash-image': {
			inputModalities: ['text', 'image'],
			capabilities: { functionCalling: false },
		},
		'models/gemini-2.5-flash-image-preview': {
			inputModalities: ['text', 'image'],
			capabilities: { functionCalling: false },
		},
		'models/gemini-2.5-flash-native-audio-preview-09-2025': {
			inputModalities: ['text', 'audio', 'video'],
		},
		'models/gemini-live-2.5-flash-preview': {
			inputModalities: ['text', 'audio', 'video'],
		},
		// Gemini 2.5 Flash-Lite series
		'models/gemini-2.5-flash-lite': {},
		'models/gemini-2.5-flash-lite-preview-06-17': {},
		'models/gemini-2.5-flash-lite-preview-09-2025': {},
		// Gemini 2.0 Pro series
		'models/gemini-2.0-pro-exp-02-05': {},
		// Gemini 2.0 Flash series
		'models/gemini-2.0-flash': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.0-flash-001': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.0-flash-exp': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.0-flash-live-001': {
			inputModalities: ['text', 'audio', 'video'],
		},
		'models/gemini-2.0-flash-thinking-exp': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.0-flash-thinking-exp-01-21': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.0-flash-thinking-exp-1219': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		// Gemini 2.0 Flash-Lite series
		'models/gemini-2.0-flash-lite': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.0-flash-lite-001': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.0-flash-lite-preview': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
		'models/gemini-2.0-flash-lite-preview-02-05': {
			inputModalities: ['text', 'image', 'video', 'audio'],
		},
	},
};

export function getModelMetadata(
	provider: ChatHubLLMProvider,
	modelId: string,
): ChatModelMetadataDto {
	const providerModels = MODEL_METADATA_REGISTRY[provider];
	const modelOverride = providerModels?.[modelId];

	if (!modelOverride) {
		return DEFAULT_MODEL_METADATA;
	}

	// Merge override with default metadata
	return {
		inputModalities: modelOverride.inputModalities ?? DEFAULT_MODEL_METADATA.inputModalities,
		capabilities: {
			functionCalling:
				modelOverride.capabilities?.functionCalling ??
				DEFAULT_MODEL_METADATA.capabilities.functionCalling,
		},
	};
}
