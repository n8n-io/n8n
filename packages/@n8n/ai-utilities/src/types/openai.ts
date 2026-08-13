import type { ProviderTool } from './tool';

export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | null;
export type VerbosityParam = 'low' | 'medium' | 'high' | null;

export interface OpenAIModelOptions {
	baseUrl: string;
	/** Model name to use */
	model: string;
	/**
	 * API key to use when making requests to OpenAI.
	 */
	apiKey: string;
	/**
	 * Provider-specific tools to use.
	 * @example
	 * {
	 *   type: 'provider',
	 *   name: 'web_search',
	 *   args: {
	 *     search_context_size: 'medium',
	 *     userLocation: {
	 *       type: "approximate",
	 *       country: "US"
	 *     },
	 *   },
	 * }
	 */
	providerTools?: ProviderTool[];
	defaultHeaders?: Record<string, string>;
	/**
	 * Whether to use the responses API for all requests. If `false` the responses API will be used
	 * only when required in order to fulfill the request.
	 */
	useResponsesApi?: boolean;
	/**
	 * Whether to return log probabilities of the output tokens or not.
	 * If true, returns the log probabilities of each output token returned in the content of message.
	 */
	logprobs?: boolean;
	/**
	 * An integer between 0 and 5 specifying the number of most likely tokens to return at each token position,
	 * each with an associated log probability. logprobs must be set to true if this parameter is used.
	 */
	topLogprobs?: number;
	/**
	 * Whether the model supports the `strict` argument when passing in tools.
	 * If `undefined` the `strict` argument will not be passed to OpenAI.
	 */
	supportsStrictToolCalling?: boolean;

	reasoning?: {
		effort?: ReasoningEffort | null;
		summary?: 'auto' | 'concise' | 'detailed' | null;
	};

	/**
	 * Should be set to `true` in tenancies with Zero Data Retention
	 * @see https://platform.openai.com/docs/guides/your-data
	 *
	 * @default false
	 */
	zdrEnabled?: boolean;

	/**
	 * Service tier to use for this request. Can be "auto", "default", or "flex" or "priority".
	 * Specifies the service tier for prioritization and latency optimization.
	 */
	service_tier?: 'auto' | 'default' | 'flex' | 'scale' | 'priority' | null;

	/**
	 * Used by OpenAI to cache responses for similar requests to optimize your cache
	 * hit rates. Replaces the `user` field.
	 * [Learn more](https://platform.openai.com/docs/guides/prompt-caching).
	 */
	promptCacheKey?: string;

	/** Sampling temperature to use */
	temperature?: number;
	/**
	 * Maximum number of tokens to generate in the completion. -1 returns as many
	 * tokens as possible given the prompt and the model's maximum context size.
	 */
	maxTokens?: number;
	/**
	 * Maximum number of tokens to generate in the completion. -1 returns as many
	 * tokens as possible given the prompt and the model's maximum context size.
	 * Alias for `maxTokens` for reasoning models.
	 */
	maxCompletionTokens?: number;
	/** Total probability mass of tokens to consider at each step */
	topP?: number;
	/** Penalizes repeated tokens according to frequency */
	frequencyPenalty?: number;
	/** Penalizes repeated tokens */
	presencePenalty?: number;
	/** Number of completions to generate for each prompt */
	n?: number;
	/** Dictionary used to adjust the probability of specific tokens being generated */
	logitBias?: Record<string, number>;
	/** Unique string identifier representing your end-user, which can help OpenAI to monitor and detect abuse. */
	user?: string;
	/** Whether to stream the results or not. Enabling disables tokenUsage reporting */
	streaming?: boolean;
	/**
	 * Whether or not to include token usage data in streamed chunks.
	 * @default true
	 */
	streamUsage?: boolean;

	/** Holds any additional parameters that are valid to pass to {@link
	 * https://platform.openai.com/docs/api-reference/completions/create |
	 * `openai.createCompletion`} that are not explicitly specified on this interface
	 */
	additionalParams?: Record<string, unknown>;
	/**
	 * List of stop words to use when generating
	 * Alias for `stopSequences`
	 */
	stop?: string[];
	/** List of stop words to use when generating */
	stopSequences?: string[];
	/**
	 * Timeout to use when making requests to OpenAI.
	 */
	timeout?: number;
	/**
	 * The verbosity of the model's response.
	 */
	verbosity?: VerbosityParam;
	/**
	 * Maximum number of retries to attempt.
	 */
	maxRetries?: number;

	/**
	 * Custom handler to handle failed attempts. Takes the originally thrown
	 * error object as input, and should itself throw an error if the input
	 * error is not retryable.
	 */
	onFailedAttempt?: (error: unknown) => void;
}
