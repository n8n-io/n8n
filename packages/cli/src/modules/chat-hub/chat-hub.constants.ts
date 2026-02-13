import type { ChatHubLLMProvider, ChatModelMetadataDto } from '@n8n/api-types';
import type { ExecutionStatus, INodeTypeNameVersion } from 'n8n-workflow';

import type { ChatTriggerResponseMode } from './chat-hub.types';

export const EXECUTION_POLL_INTERVAL = 1000;
export const STREAM_CLOSE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
export const EXECUTION_FINISHED_STATUSES: ExecutionStatus[] = [
	'canceled',
	'crashed',
	'unknown',
	'waiting',
	'error',
	'success',
] as const satisfies ExecutionStatus[];
export const TOOLS_AGENT_NODE_MIN_VERSION = 2.2;
export const CHAT_TRIGGER_NODE_MIN_VERSION = 1.2;

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
		name: '@n8n/n8n-nodes-langchain.lmChatOllama',
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
	available: true,
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
		'claude-haiku-4-5-20251001': {
			inputModalities: ['text', 'image'],
			priority: 70,
		},
		'claude-sonnet-4-5-20250929': {
			inputModalities: ['text', 'image'],
			priority: 80,
		},
		'claude-opus-4-6': {
			inputModalities: ['text', 'image'],
			priority: 100,
		},
		'claude-opus-4-5-20251101': {
			inputModalities: ['text', 'image'],
			priority: 90,
		},
		'claude-opus-4-20250514': {
			inputModalities: ['text', 'image'],
		},
		'claude-opus-4-1-20250805': {
			inputModalities: ['text', 'image'],
		},
	},
	openai: {
		// Search models - specialized for search, not general chat
		'gpt-4o-mini-search-preview': {
			available: false,
		},
		'gpt-4o-mini-search-preview-2025-03-11': {
			available: false,
		},
		'gpt-4o-search-preview': {
			available: false,
		},
		'gpt-4o-search-preview-2025-03-11': {
			available: false,
		},
		'gpt-5-search-api': {
			available: false,
		},
		'gpt-5-search-api-2025-10-14': {
			available: false,
		},
		// Transcription models - for speech-to-text, not chat
		'gpt-4o-transcribe': {
			available: false,
		},
		'gpt-4o-mini-transcribe': {
			available: false,
		},
		'gpt-4o-transcribe-diarize': {
			available: false,
		},
		// Image generation models - for creating images, not chat
		'gpt-image-1': {
			available: false,
		},
		'gpt-image-1-mini': {
			available: false,
		},
		// Deep research models - long-running research, not interactive chat
		'o4-mini-deep-research': {
			available: false,
		},
		'o4-mini-deep-research-2025-06-26': {
			available: false,
		},
		// Audio models - designed for audio I/O, not text chat
		'gpt-4o-audio-preview': {
			available: false,
		},
		'gpt-4o-audio-preview-2024-10-01': {
			available: false,
		},
		'gpt-4o-audio-preview-2024-12-17': {
			available: false,
		},
		'gpt-4o-audio-preview-2025-06-03': {
			available: false,
		},
		'gpt-4o-mini-audio-preview': {
			available: false,
		},
		'gpt-4o-mini-audio-preview-2024-12-17': {
			available: false,
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
		'gpt-audio': {
			available: false,
		},
		'gpt-audio-2025-08-28': {
			available: false,
		},
		'gpt-audio-mini': {
			available: false,
		},
		'gpt-audio-mini-2025-10-06': {
			available: false,
		},
		'gpt-3.5-turbo-16k': {
			available: false,
		},
		'gpt-5.2': {
			priority: 100,
		},
		'gpt-5.2-pro': {
			priority: 99,
		},
		'gpt-5.1': {
			priority: 90,
		},
		'gpt-5-pro': {
			priority: 85,
		},
		'gpt-5': {
			priority: 84,
		},
		'gpt-5-mini': {
			priority: 83,
		},
		'gpt-5-nano': {
			priority: 82,
		},
		'gpt-4.1': {
			priority: 80,
		},
		'gpt-4.1-mini': {
			priority: 79,
		},
		'gpt-4.1-nano': {
			priority: 78,
		},
		'o4-mini': {
			inputModalities: ['text'],
			priority: 70,
		},
		'o4-mini-2025-04-16': {
			inputModalities: ['text'],
		},
		'o4-mini-high': {
			inputModalities: ['text'],
			priority: 69,
		},
		o3: {
			inputModalities: ['text'],
			priority: 60,
		},
		'o3-pro': {
			inputModalities: ['text'],
			priority: 59,
		},
		'o3-pro-2025-06-10': {
			inputModalities: ['text'],
		},
		'o3-mini': {
			inputModalities: ['text'],
			priority: 58,
		},
		'o3-2025-04-16': {
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
		'mistral-moderation-2411': {
			available: false,
		},
		'mistral-moderation-latest': {
			available: false,
		},
		'mistral-ocr-2503': {
			available: false,
		},
		'mistral-ocr-2505': {
			available: false,
		},
		'mistral-ocr-latest': {
			available: false,
		},
		'voxtral-mini-transcribe-2507': {
			available: false,
		},
	},
	// Reference: https://ai.google.dev/gemini-api/docs/models
	google: {
		// Gemini 3 series - latest models with advanced multimodal understanding
		'models/gemini-3-pro-image-preview': {
			inputModalities: ['text', 'image'],
			capabilities: { functionCalling: false },
		},
		// Gemini 2.5 Pro series
		'models/gemini-2.5-pro': {
			inputModalities: ['text', 'image', 'video', 'audio'],
			priority: 100,
		},
		'models/gemini-2.5-pro-preview-tts': {
			inputModalities: ['text'],
			capabilities: { functionCalling: false },
		},
		// Gemini 2.5 Flash series
		'models/gemini-2.5-flash': {
			inputModalities: ['text', 'image', 'video', 'audio'],
			priority: 90,
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
		// Gemini 2.0 Flash series
		'models/gemini-2.0-flash': {
			inputModalities: ['text', 'image', 'video', 'audio'],
			priority: 80,
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
			priority: 60,
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
		'models/aqa': {
			priority: -1,
		},
	},
	groq: {
		'meta-llama/llama-prompt-guard-2-22m': {
			available: false,
		},
		'meta-llama/llama-prompt-guard-2-86m': {
			available: false,
		},
		'whisper-large-v3': {
			available: false,
		},
		'whisper-large-v3-turbo': {
			available: false,
		},
	},
	vercelAiGateway: {
		'alibaba/qwen3-embedding-0.6b': {
			available: false,
		},
		'alibaba/qwen3-embedding-4b': {
			available: false,
		},
		'alibaba/qwen3-embedding-8b': {
			available: false,
		},
		'amazon/titan-embed-text-v2': {
			available: false,
		},
		'cohere/embed-v4.0': {
			available: false,
		},
		'google/gemini-embedding-001': {
			available: false,
		},
		'google/text-embedding-005': {
			available: false,
		},
		'google/text-multilingual-embedding-002': {
			available: false,
		},
		'mistral/codestral-embed': {
			available: false,
		},
		'mistral/mistral-embed': {
			available: false,
		},
		'openai/text-embedding-3-large': {
			available: false,
		},
		'openai/text-embedding-3-small': {
			available: false,
		},
		'openai/text-embedding-ada-002': {
			available: false,
		},
		'bfl/flux-kontext-max': {
			available: false,
		},
		'bfl/flux-kontext-pro': {
			available: false,
		},
		'bfl/flux-pro-1.0-fill': {
			available: false,
		},
		'bfl/flux-pro-1.1': {
			available: false,
		},
		'bfl/flux-pro-1.1-ultra': {
			available: false,
		},
		'google/imagen-4.0-fast-generate-001': {
			available: false,
		},
		'google/imagen-4.0-generate-001': {
			available: false,
		},
		'google/imagen-4.0-ultra-generate-001': {
			available: false,
		},
		// Instruct models - not suitable for chat
		'openai/gpt-3.5-turbo-instruct': {
			available: false,
		},
		// Deep research models - require specific tools
		'openai/o3-deep-research': {
			available: false,
		},
		// Model not found - may have been deprecated
		'meituan/longcat-flash-thinking': {
			available: false,
		},
		// Voyage models - language model method not implemented
		'voyage/voyage-3-large': {
			available: false,
		},
		'voyage/voyage-3.5': {
			available: false,
		},
		'voyage/voyage-3.5-lite': {
			available: false,
		},
		'voyage/voyage-code-2': {
			available: false,
		},
		'voyage/voyage-code-3': {
			available: false,
		},
		'voyage/voyage-finance-2': {
			available: false,
		},
		'voyage/voyage-law-2': {
			available: false,
		},
	},
	openRouter: {
		'openai/gpt-4o-audio-preview': {
			available: false, // "Provider returned error"
		},
		'morph/morph-v3-fast': {
			available: false, // Not supporting multi-turn conversations
		},
		'morph/morph-v3-large': {
			available: false, // Not supporting multi-turn conversations
		},
		'relace/relace-apply-3': {
			available: false, // Not supporting multi-turn conversations
		},
	},
	xAiGrok: {
		'grok-4-1-fast-non-reasoning': {
			priority: 100,
		},
		'grok-4-1-fast-reasoning': {
			priority: 99,
		},
		'grok-4-fast-non-reasoning': {
			priority: 90,
		},
		'grok-4-fast-reasoning': {
			priority: 89,
		},
		'grok-4-0709': {
			priority: 88,
		},
		'grok-3': {
			priority: 80,
		},
		'grok-3-mini': {
			priority: 79,
		},
		'grok-2-1212': {
			priority: 70,
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
		priority: modelOverride.priority,
		capabilities: {
			functionCalling:
				modelOverride.capabilities?.functionCalling ??
				DEFAULT_MODEL_METADATA.capabilities.functionCalling,
		},
		available: modelOverride.available ?? true,
	};
}

export const SUPPORTED_RESPONSE_MODES: ChatTriggerResponseMode[] = [
	'streaming',
	'lastNode',
	'responseNodes',
] as const;
