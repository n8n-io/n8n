/**
 * Canonical "if you have one of THIS credential type, this is the LLM provider
 * + model the builder may select when auto-resolving." Used by the resolve_llm
 * tool when there's exactly one LLM-provider credential available.
 *
 * Provider strings match the provider IDs used by `@n8n/agents`'s
 * `.model(provider, model)` call.
 *
 * Keep this list narrow — when the canonical default is unclear (e.g. Bedrock,
 * Azure variants), omit the entry so the tool falls through to suspending and
 * lets the user pick explicitly.
 *
 * Live model validation is available for providers supported by
 * `@n8n/ai-utilities/model-discovery` — `resolve_llm` checks user-requested
 * model strings against the provider's live model list for those.
 */
export interface LlmProviderDefault {
	provider: string;
	defaultModel: string;
}

export const LLM_PROVIDER_DEFAULTS: Record<string, LlmProviderDefault> = {
	anthropicApi: {
		provider: 'anthropic',
		defaultModel: 'claude-sonnet-4-6',
	},
	openAiApi: {
		provider: 'openai',
		defaultModel: 'gpt-5-mini',
	},
	googlePalmApi: {
		provider: 'google',
		defaultModel: 'gemini-2.5-pro',
	},
	xAiApi: {
		provider: 'xai',
		defaultModel: 'grok-4',
	},
	groqApi: {
		provider: 'groq',
		defaultModel: 'llama-3.3-70b-versatile',
	},
	mistralCloudApi: {
		provider: 'mistral',
		defaultModel: 'mistral-large-latest',
	},
	deepSeekApi: {
		provider: 'deepseek',
		defaultModel: 'deepseek-chat',
	},
	cohereApi: {
		provider: 'cohere',
		defaultModel: 'command-r-plus',
	},
	openRouterApi: {
		provider: 'openrouter',
		defaultModel: 'anthropic/claude-sonnet-4.6',
	},
	nvidiaApi: {
		provider: 'nvidia',
		defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1',
	},
	vercelAiGatewayApi: {
		provider: 'vercel',
		defaultModel: 'anthropic/claude-sonnet-4.6',
	},
};
