/**
 * Canonical "if you have one of THIS credential type, this is the LLM provider
 * + safe default model to seed the agent with." Used by the ask_llm tool to
 * auto-resolve when there's exactly one LLM-provider credential available.
 *
 * Provider strings match the catalog IDs used by `@n8n/agents`'s
 * `.model(provider, model)` call (see editor-ui's provider-mapping.ts for the
 * other side of this contract).
 *
 * Keep this list narrow — when the canonical default is unclear (e.g. Bedrock,
 * Azure variants), omit the entry so the tool falls through to suspending and
 * lets the user pick explicitly.
 *
 * `modelLookup` (optional) points at the chat-model node whose
 * `@searchListMethod` or routing-based `loadOptions` returns the live list of
 * model ids for the provider. When set, `resolve_llm` validates user-requested
 * model strings against that list. When absent, the requested model is passed
 * through unchanged.
 */
export type ModelLookupConfig =
	| {
			kind: 'listSearch';
			nodeType: string;
			version: number;
			methodName: string;
	  }
	| {
			kind: 'loadOptionsRouting';
			nodeType: string;
			version: number;
			propertyName: string;
	  };

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
		defaultModel: 'gpt-5',
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
};
