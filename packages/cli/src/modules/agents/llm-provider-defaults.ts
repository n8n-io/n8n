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
 * These are hints, not guarantees. For providers supported by
 * `@n8n/ai-utilities/model-discovery`, `resolve_llm` verifies the model it is
 * about to return — the default included — against the credential's live model
 * list, so a default the provider stops serving degrades to a prompt to pick
 * rather than shipping into an agent config.
 */
export interface LlmProviderDefault {
	provider: string;
	defaultModel: string;
}

export const LLM_PROVIDER_DEFAULTS: Record<string, LlmProviderDefault> = {
	anthropicApi: {
		provider: 'anthropic',
		defaultModel: 'claude-sonnet-5',
	},
	openAiApi: {
		provider: 'openai',
		defaultModel: 'gpt-5.6-terra',
	},
	googlePalmApi: {
		provider: 'google',
		// The 3.x Pro line is still preview-only; 3.7 Flash is the current stable
		// GA pick. Not every key can reach it, so resolve_llm verifies it against
		// the credential's live list rather than trusting it.
		defaultModel: 'gemini-3.7-flash',
	},
	xAiApi: {
		provider: 'xai',
		defaultModel: 'grok-4.6',
	},
	groqApi: {
		provider: 'groq',
		// Groq shut down its Llama 3.x models in Aug 2026; this is their
		// recommended replacement.
		defaultModel: 'openai/gpt-oss-120b',
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
		defaultModel: 'command-a-plus-05-2026',
	},
	openRouterApi: {
		provider: 'openrouter',
		defaultModel: 'anthropic/claude-sonnet-5',
	},
	nvidiaApi: {
		provider: 'nvidia',
		defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1',
	},
	vercelAiGatewayApi: {
		provider: 'vercel',
		defaultModel: 'anthropic/claude-sonnet-5',
	},
	moonshotApi: {
		provider: 'moonshotai',
		defaultModel: 'kimi-k3',
	},
	alibabaCloudApi: {
		provider: 'alibaba',
		// Rolling alias that Alibaba keeps pointed at the current plus model
		defaultModel: 'qwen-plus',
	},
	minimaxApi: {
		provider: 'minimax',
		defaultModel: 'MiniMax-M3',
	},
	volcengineApi: {
		provider: 'volcengine',
		defaultModel: 'doubao-seed-2-1-pro-260628',
	},
};

/** Order in which resolve_llm auto-picks a provider when credentials span multiple providers. */
export const LLM_PROVIDER_PRIORITY: string[] = [
	'anthropic',
	'openai',
	'google',
	'mistral',
	'xai',
	'groq',
	'deepseek',
	'cohere',
	'openrouter',
	'nvidia',
	'vercel',
	'moonshotai',
	'alibaba',
	'minimax',
	'volcengine',
];
