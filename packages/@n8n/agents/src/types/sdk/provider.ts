/**
 * Known providers with typed thinking configs. The `(string & {})` escape
 * hatch lets any provider string pass while preserving autocomplete for
 * the known ones.
 */
export type Provider =
	| 'anthropic'
	| 'cerebras'
	| 'deepinfra'
	| 'deepseek'
	| 'google'
	| 'groq'
	| 'mistral'
	| 'openai'
	| 'openrouter'
	| 'perplexity'
	| 'togetherai'
	| 'vercel'
	| 'xai'
	| (string & {});

// --- Per-Provider Thinking Configs ---

export interface AnthropicThinkingConfig {
	/** Token budget for extended thinking. Defaults to 10000. */
	budgetTokens?: number;
}

export interface OpenAIThinkingConfig {
	/** Reasoning effort level. Defaults to 'medium'. */
	reasoningEffort?: 'low' | 'medium' | 'high';
}

export interface GoogleThinkingConfig {
	/** Token budget for thinking. */
	thinkingBudget?: number;
	/** Thinking level preset. */
	thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}

export interface XaiThinkingConfig {
	/** Reasoning effort level. */
	reasoningEffort?: 'low' | 'high';
}

/**
 * Resolve thinking config type from provider.
 * Known providers get their specific config; unknown providers default
 * to OpenAI-style (reasoningEffort) since most providers follow that API.
 */
export type ThinkingConfigFor<P> = P extends 'anthropic'
	? AnthropicThinkingConfig
	: P extends 'google'
		? GoogleThinkingConfig
		: P extends 'xai'
			? XaiThinkingConfig
			: P extends string
				? OpenAIThinkingConfig
				: ThinkingConfig;

/** Union of all thinking configs (used when provider is unknown). */
export type ThinkingConfig =
	| AnthropicThinkingConfig
	| OpenAIThinkingConfig
	| GoogleThinkingConfig
	| XaiThinkingConfig;
