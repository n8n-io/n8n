import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { LLMResult } from '@langchain/core/outputs';

export interface AccumulatedTokenUsage {
	inputTokens: number;
	outputTokens: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractInputTokens(usage: Record<string, unknown>): number {
	if (typeof usage.input_tokens === 'number') {
		return usage.input_tokens;
	}
	if (typeof usage.prompt_tokens === 'number') {
		return usage.prompt_tokens;
	}
	return 0;
}

function extractOutputTokens(usage: Record<string, unknown>): number {
	if (typeof usage.output_tokens === 'number') {
		return usage.output_tokens;
	}
	if (typeof usage.completion_tokens === 'number') {
		return usage.completion_tokens;
	}
	return 0;
}

/**
 * Callback handler that tracks token usage from all LLM calls.
 * Intercepts handleLLMEnd callbacks from LangChain/LangGraph and
 * accumulates inputTokens/outputTokens across all LLM calls.
 *
 * Token usage is extracted from LLM response metadata, supporting:
 * - Anthropic: input_tokens, output_tokens
 * - OpenAI: prompt_tokens, completion_tokens
 */
export class TokenUsageTrackingHandler extends BaseCallbackHandler {
	name = 'TokenUsageTrackingHandler';

	private totalInputTokens = 0;

	private totalOutputTokens = 0;

	async handleLLMEnd(output: LLMResult): Promise<void> {
		if (isRecord(output.llmOutput) && isRecord(output.llmOutput.usage)) {
			this.totalInputTokens += extractInputTokens(output.llmOutput.usage);
			this.totalOutputTokens += extractOutputTokens(output.llmOutput.usage);
			return;
		}

		for (const generation of output.generations.flat()) {
			if (isRecord(generation.generationInfo) && isRecord(generation.generationInfo.usage)) {
				this.totalInputTokens += extractInputTokens(generation.generationInfo.usage);
				this.totalOutputTokens += extractOutputTokens(generation.generationInfo.usage);
			}
		}
	}

	getUsage(): AccumulatedTokenUsage {
		return {
			inputTokens: this.totalInputTokens,
			outputTokens: this.totalOutputTokens,
		};
	}

	reset(): void {
		this.totalInputTokens = 0;
		this.totalOutputTokens = 0;
	}
}
