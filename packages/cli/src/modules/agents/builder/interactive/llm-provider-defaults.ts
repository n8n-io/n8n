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
 */
export interface LlmProviderDefault {
	provider: string;
	defaultModel: string;
}

export const LLM_PROVIDER_DEFAULTS: Record<string, LlmProviderDefault> = {
	anthropicApi: { provider: 'anthropic', defaultModel: 'claude-sonnet-4-6' },
	openAiApi: { provider: 'openai', defaultModel: 'gpt-5' },
	googlePalmApi: { provider: 'google', defaultModel: 'gemini-2.5-pro' },
	xAiApi: { provider: 'xai', defaultModel: 'grok-4' },
	groqApi: { provider: 'groq', defaultModel: 'llama-3.1-70b-versatile' },
	mistralCloudApi: { provider: 'mistral', defaultModel: 'mistral-large-latest' },
	deepSeekApi: { provider: 'deepseek', defaultModel: 'deepseek-chat' },
	cohereApi: { provider: 'cohere', defaultModel: 'command-r-plus' },
	openRouterApi: { provider: 'openrouter', defaultModel: 'anthropic/claude-sonnet-4.6' },
};
