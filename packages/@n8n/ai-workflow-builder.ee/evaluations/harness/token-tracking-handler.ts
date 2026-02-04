import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { LLMResult } from '@langchain/core/outputs';

/**
 * Accumulated token usage from all LLM calls.
 */
export interface AccumulatedTokenUsage {
	inputTokens: number;
	outputTokens: number;
}

/**
 * Type guard to check if a value is a record (plain object).
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Extract input tokens from a usage object.
 * Supports both Anthropic (input_tokens) and OpenAI (prompt_tokens) formats.
 */
function extractInputTokens(usage: Record<string, unknown>): number {
	// Anthropic format
	if (typeof usage.input_tokens === 'number') {
		return usage.input_tokens;
	}
	// OpenAI format
	if (typeof usage.prompt_tokens === 'number') {
		return usage.prompt_tokens;
	}
	return 0;
}

/**
 * Extract output tokens from a usage object.
 * Supports both Anthropic (output_tokens) and OpenAI (completion_tokens) formats.
 */
function extractOutputTokens(usage: Record<string, unknown>): number {
	// Anthropic format
	if (typeof usage.output_tokens === 'number') {
		return usage.output_tokens;
	}
	// OpenAI format
	if (typeof usage.completion_tokens === 'number') {
		return usage.completion_tokens;
	}
	return 0;
}

/**
 * Callback handler that tracks token usage from all LLM calls.
 * Used during evaluation to capture total generation costs across all agents
 * (supervisor, discovery, builder, responder).
 *
 * Token usage is extracted from LLM response metadata, supporting:
 * - Anthropic: input_tokens, output_tokens
 * - OpenAI: prompt_tokens, completion_tokens
 */
export class TokenUsageTrackingHandler extends BaseCallbackHandler {
	name = 'TokenUsageTrackingHandler';

	private totalInputTokens = 0;
	private totalOutputTokens = 0;

	/**
	 * Called when an LLM call completes.
	 * Extracts and accumulates token usage from the response.
	 */
	async handleLLMEnd(output: LLMResult): Promise<void> {
		// Token usage can be in different locations depending on the provider
		// Check llmOutput first (common for Anthropic and OpenAI)
		if (isRecord(output.llmOutput) && isRecord(output.llmOutput.usage)) {
			this.totalInputTokens += extractInputTokens(output.llmOutput.usage);
			this.totalOutputTokens += extractOutputTokens(output.llmOutput.usage);
			return;
		}

		// Also check generations for token usage in response_metadata
		for (const generation of output.generations.flat()) {
			if (isRecord(generation.generationInfo) && isRecord(generation.generationInfo.usage)) {
				this.totalInputTokens += extractInputTokens(generation.generationInfo.usage);
				this.totalOutputTokens += extractOutputTokens(generation.generationInfo.usage);
			}
		}
	}

	/**
	 * Get the total accumulated token usage.
	 */
	getUsage(): AccumulatedTokenUsage {
		return {
			inputTokens: this.totalInputTokens,
			outputTokens: this.totalOutputTokens,
		};
	}

	/**
	 * Reset the accumulated usage (useful for reuse across multiple runs).
	 */
	reset(): void {
		this.totalInputTokens = 0;
		this.totalOutputTokens = 0;
	}
}
