import type { Message } from './message';
import type { GenerateResult, StreamChunk } from './output';
import type { Tool } from './tool';

export interface ChatModelConfig {
	/**
	 * Maximum number of tokens to generate
	 */
	maxTokens?: number;

	/**
	 * Temperature setting for randomness (typically 0-2)
	 */
	temperature?: number;

	/**
	 * Nucleus sampling - probability mass to consider (0-1)
	 */
	topP?: number;

	/**
	 * Top-K sampling - number of top tokens to consider
	 */
	topK?: number;

	/**
	 * Presence penalty to reduce repetition of information (-1 to 1)
	 */
	presencePenalty?: number;

	/**
	 * Frequency penalty to reduce repetition of words/phrases (-1 to 1)
	 */
	frequencyPenalty?: number;

	/**
	 * Stop sequences to halt generation
	 */
	stopSequences?: string[];

	/**
	 * Seed for deterministic generation
	 */
	seed?: number;

	/**
	 * Maximum number of retries on failure
	 */
	maxRetries?: number;

	/**
	 * Request timeout in milliseconds
	 */
	timeout?: number;

	/**
	 * Abort signal for cancellation
	 */
	abortSignal?: AbortSignal;

	/**
	 * Additional HTTP headers
	 */
	headers?: Record<string, string | undefined>;
}

export interface ChatModel<TConfig extends ChatModelConfig = ChatModelConfig> {
	/**
	 * Provider identifier (e.g., 'openai', 'anthropic', 'google')
	 */
	provider: string;

	/**
	 * Model identifier (e.g., 'gpt-4', 'claude-3-sonnet')
	 */
	modelId: string;

	/**
	 * Default configuration for the model
	 */
	defaultConfig?: TConfig;

	/**
	 * Generate a completion (non-streaming)
	 */
	generate(messages: Message[], config?: TConfig): Promise<GenerateResult>;

	/**
	 * Generate a completion (streaming)
	 */
	stream(messages: Message[], config?: TConfig): AsyncIterable<StreamChunk>;

	/**
	 * Bind tools to the model for tool calling
	 */
	withTools(tools: Tool[]): ChatModel<TConfig>;

	/**
	 * Bind structured output schema
	 */
	withStructuredOutput?(schema: Record<string, unknown>): ChatModel<TConfig>;
}
