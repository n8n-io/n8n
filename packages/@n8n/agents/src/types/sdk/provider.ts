/**
 * Known providers with typed thinking configs. The `(string & {})` escape
 * hatch lets any provider string pass while preserving autocomplete for
 * the known ones.
 */
export type Provider =
	| 'anthropic'
	| 'cerebras'
	| 'custom'
	| 'deepinfra'
	| 'deepseek'
	| 'google'
	| 'google-vertex-anthropic'
	| 'groq'
	| 'mistral'
	| 'openai'
	| 'openrouter'
	| 'perplexity'
	| 'vercel'
	| 'xai'
	| (string & {});

// --- Per-Provider Thinking Configs ---

/**
 * Anthropic extended-thinking config. Discriminated by `mode`.
 * - `'adaptive'`: the model decides how much to think per request.
 * - `'enabled'` (default): a fixed token budget controlled by `budgetTokens`.
 */
export type AnthropicThinkingEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type AnthropicThinkingConfig =
	| {
			mode: 'adaptive';
			/**
			 * Controls whether thinking content is returned. Opus 4.7+ defaults to
			 * `"omitted"` on the Anthropic API; we default to `"summarized"` so
			 * reasoning streams and replay metadata are available.
			 */
			display?: 'omitted' | 'summarized';
			/**
			 * Adaptive-thinking effort (`output_config.effort` on the Anthropic API).
			 * When omitted, Anthropic/SDK defaults apply.
			 */
			effort?: AnthropicThinkingEffort;
	  }
	| {
			mode?: 'enabled';
			/** Token budget for extended thinking. Defaults to 10000 when `effort` is omitted. */
			budgetTokens?: number;
			/**
			 * Maps to Anthropic `output_config.effort`. Used with `type: 'enabled'` for
			 * Anthropic-compatible gateways that reject `adaptive`.
			 */
			effort?: AnthropicThinkingEffort;
	  };

/**
 * OpenAI / AI SDK reasoning effort.
 * GPT-5.6 Sol supports none|low|medium|high|xhigh|max (no `minimal`).
 * Older reasoning models may also accept `minimal`.
 */
export type OpenAIReasoningEffort =
	| 'none'
	| 'minimal'
	| 'low'
	| 'medium'
	| 'high'
	| 'xhigh'
	| 'max';

export interface OpenAIThinkingConfig {
	/**
	 * Reasoning effort level. Mapped to AI SDK `providerOptions.<provider>.reasoningEffort`.
	 * OpenAI quirks may default when unset; `custom` only forwards an explicit value.
	 */
	reasoningEffort?: OpenAIReasoningEffort;
}

export interface GoogleThinkingConfig {
	/** Token budget for thinking. */
	thinkingBudget?: number;
	/** Thinking level preset. */
	thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}

export interface XaiThinkingConfig {
	/** Reasoning effort level. */
	reasoningEffort?: 'low' | 'medium' | 'high';
}

/**
 * Resolve thinking config type from provider.
 * Known providers get their specific config; unknown providers default
 * to OpenAI-style (reasoningEffort) since most providers follow that API.
 */
export type ThinkingConfigFor<P> = P extends 'anthropic' | 'google-vertex-anthropic'
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
