/**
 * Canonical "if you have one of THIS credential type, this is the LLM provider
 * + model the builder may select when auto-resolving." Ported verbatim from the
 * CLI agent builder. Provider strings match the provider IDs used by
 * `@n8n/agents`'s `.model(provider, model)` call.
 *
 * `modelLookup` points at the chat-model node whose search/load-options method
 * returns the live model ids for the provider; resolve_llm validates requested
 * models against it. When absent, the requested model is passed through.
 */
import type { ModelLookupConfig } from '../../types';

export interface LlmProviderDefault {
	provider: string;
	defaultModel: string;
	modelLookup?: ModelLookupConfig;
}

export const LLM_PROVIDER_DEFAULTS: Record<string, LlmProviderDefault> = {
	anthropicApi: {
		provider: 'anthropic',
		defaultModel: 'claude-sonnet-4-6',
		modelLookup: {
			kind: 'listSearch',
			nodeType: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
			version: 1.5,
			methodName: 'searchModels',
		},
	},
	openAiApi: {
		provider: 'openai',
		defaultModel: 'gpt-5-mini',
		modelLookup: {
			kind: 'listSearch',
			nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			methodName: 'searchModels',
		},
	},
	googlePalmApi: {
		provider: 'google',
		defaultModel: 'gemini-2.5-pro',
		modelLookup: {
			kind: 'loadOptionsRouting',
			nodeType: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1.1,
			propertyName: 'modelName',
		},
	},
	xAiApi: { provider: 'xai', defaultModel: 'grok-4' },
	groqApi: { provider: 'groq', defaultModel: 'llama-3.1-70b-versatile' },
	mistralCloudApi: {
		provider: 'mistral',
		defaultModel: 'mistral-large-latest',
		modelLookup: {
			kind: 'loadOptionsRouting',
			nodeType: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
			version: 1,
			propertyName: 'model',
		},
	},
	deepSeekApi: { provider: 'deepseek', defaultModel: 'deepseek-chat' },
	cohereApi: { provider: 'cohere', defaultModel: 'command-r-plus' },
	openRouterApi: {
		provider: 'openrouter',
		defaultModel: 'anthropic/claude-sonnet-4.6',
		modelLookup: {
			kind: 'loadOptionsRouting',
			nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
			version: 1,
			propertyName: 'model',
		},
	},
	nvidiaApi: {
		provider: 'nvidia',
		defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1',
		modelLookup: {
			kind: 'loadOptionsRouting',
			nodeType: '@n8n/n8n-nodes-langchain.lmChatNvidia',
			version: 1,
			propertyName: 'model',
		},
	},
};
