/**
 * Agent Iteration Handler
 *
 * Handles a single iteration of the agentic loop in the code builder agent.
 * Extracts the loop body logic for better testability and maintainability.
 */

import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import type { BaseMessage, AIMessage } from '@langchain/core/messages';
import type { Runnable } from '@langchain/core/runnables';

import type { StreamOutput, AgentMessageChunk } from '../../types/streaming';
import { applySubgraphCacheMarkers } from '../../utils/cache-control/helpers';
import type { TokenUsage } from '../types';
import { extractTextContent, extractThinkingContent } from '../utils/content-extractors';

/** Type guard for response metadata with usage info */
interface ResponseMetadataWithUsage {
	usage: { input_tokens?: number; output_tokens?: number; thinking_tokens?: number };
}

function hasUsageMetadata(metadata: unknown): metadata is ResponseMetadataWithUsage {
	return (
		typeof metadata === 'object' &&
		metadata !== null &&
		'usage' in metadata &&
		typeof (metadata as ResponseMetadataWithUsage).usage === 'object'
	);
}

/**
 * Configuration for AgentIterationHandler
 */
export interface AgentIterationHandlerConfig {
	onTokenUsage?: (usage: TokenUsage) => void;
	/** Optional LangChain callbacks (e.g., LangSmith tracer) for LLM invocations */
	callbacks?: Callbacks;
	/** Optional metadata to include in LangSmith traces */
	runMetadata?: Record<string, unknown>;
}

/**
 * Parameters for a single iteration
 */
export interface IterationParams {
	/** LLM with tools bound */
	llmWithTools: Runnable<BaseMessage[], AIMessage, BaseChatModelCallOptions>;
	/** Current message history */
	messages: BaseMessage[];
	/** Optional abort signal */
	abortSignal?: AbortSignal;
	/** Current iteration number */
	iteration: number;
	/** Per-iteration child callbacks (overrides constructor callbacks when provided) */
	callbacks?: Callbacks;
}

/**
 * Result of LLM invocation (before tool processing)
 */
export interface LlmInvocationResult {
	/** The LLM response */
	response: AIMessage;
	/** Input tokens used */
	inputTokens: number;
	/** Output tokens used */
	outputTokens: number;
	/** Duration of LLM call in ms */
	llmDurationMs: number;
	/** Extracted text content (for streaming) */
	textContent: string | null;
	/** Extracted thinking content (for logging) */
	thinkingContent: string | null;
	/** Whether response has tool calls */
	hasToolCalls: boolean;
}

/**
 * Handles the LLM invocation part of an iteration.
 *
 * This handler:
 * 1. Invokes the LLM with message history
 * 2. Extracts token usage from response
 * 3. Extracts text and thinking content
 * 4. Yields streamed text content
 * 5. Adds AI message to history
 *
 * Tool call processing and final response parsing are handled separately
 * by the caller using the appropriate handlers.
 */
export class AgentIterationHandler {
	private onTokenUsage?: (usage: TokenUsage) => void;
	private callbacks?: Callbacks;
	private runMetadata?: Record<string, unknown>;

	constructor(config: AgentIterationHandlerConfig = {}) {
		this.onTokenUsage = config.onTokenUsage;
		this.callbacks = config.callbacks;
		this.runMetadata = config.runMetadata;
	}

	/** Get the configured callbacks (for creating parent runs) */
	getCallbacks(): Callbacks | undefined {
		return this.callbacks;
	}

	/** Get the configured run metadata (for creating parent runs) */
	getRunMetadata(): Record<string, unknown> | undefined {
		return this.runMetadata;
	}

	/**
	 * Invoke the LLM and process the initial response.
	 *
	 * This handles the common LLM invocation logic:
	 * - Invoke LLM with messages
	 * - Extract token usage
	 * - Extract text and thinking content
	 * - Stream text content
	 * - Add response to message history
	 *
	 * @param params - Iteration parameters
	 * @yields StreamOutput chunks for streamed text content
	 * @returns LLM invocation result for further processing
	 */
	async *invokeLlm(
		params: IterationParams,
	): AsyncGenerator<StreamOutput, LlmInvocationResult, unknown> {
		const { llmWithTools, messages, abortSignal, callbacks: iterationCallbacks } = params;

		// Check for abort
		if (abortSignal?.aborted) {
			throw new Error('Aborted');
		}

		// Apply cache markers for prompt caching optimization
		applySubgraphCacheMarkers(messages);

		const llmStartTime = Date.now();
		const response = await llmWithTools.invoke(messages, {
			signal: abortSignal,
			callbacks: iterationCallbacks ?? this.callbacks,
			metadata: this.runMetadata,
		});
		const llmDurationMs = Date.now() - llmStartTime;

		// Extract token usage from response metadata using type guard
		const responseMetadata = response.response_metadata;
		const inputTokens = hasUsageMetadata(responseMetadata)
			? (responseMetadata.usage.input_tokens ?? 0)
			: 0;
		const outputTokens = hasUsageMetadata(responseMetadata)
			? (responseMetadata.usage.output_tokens ?? 0)
			: 0;
		const thinkingTokens = hasUsageMetadata(responseMetadata)
			? (responseMetadata.usage.thinking_tokens ?? 0)
			: 0;

		// Report token usage via callback (fire and forget)
		if (this.onTokenUsage && (inputTokens > 0 || outputTokens > 0)) {
			this.onTokenUsage({ inputTokens, outputTokens, thinkingTokens });
		}

		const thinkingContent = extractThinkingContent(response);

		// Extract text content from response
		const textContent = extractTextContent(response);
		if (textContent) {
			const messageChunk: AgentMessageChunk = {
				role: 'assistant',
				type: 'message',
				text: textContent,
			};
			yield {
				messages: [messageChunk],
			};
		}

		// Add AI message to history
		messages.push(response);

		return {
			response,
			inputTokens,
			outputTokens,
			llmDurationMs,
			textContent,
			thinkingContent,
			hasToolCalls: !!(response.tool_calls && response.tool_calls.length > 0),
		};
	}
}
