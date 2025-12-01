import type { EngineResponse } from 'n8n-workflow';

import { buildSteps } from '@utils/agent-execution';
import type { TokenUsageData } from '@utils/agent-execution/AgentTokenTracker';

import type { RequestResponseMetadata } from '../types';

/**
 * Builds metadata for an engine request, tracking iteration count and previous requests.
 *
 * This helper centralizes the logic for incrementing iteration count and building
 * the request history, which is used to enforce max iterations and maintain context.
 *
 * @param response - The optional engine response from previous tool execution
 * @param itemIndex - The current item index being processed
 * @param currentTokens - Optional token usage from the current iteration
 * @returns Metadata object with previousRequests, iterationCount, and accumulated tokens
 *
 */
export function buildResponseMetadata(
	response: EngineResponse<RequestResponseMetadata> | undefined,
	itemIndex: number,
	currentTokens?: TokenUsageData,
): RequestResponseMetadata {
	const currentIterationCount = response?.metadata?.iterationCount ?? 0;
	const previousRequests = buildSteps(response, itemIndex);

	// Merge current iteration tokens with previous accumulated tokens
	let accumulatedTokens: TokenUsageData | undefined;
	if (currentTokens || response?.metadata?.accumulatedTokens) {
		const prev = response?.metadata?.accumulatedTokens ?? {
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 0,
			isEstimate: false,
		};
		const curr = currentTokens ?? {
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 0,
			isEstimate: false,
		};

		accumulatedTokens = {
			promptTokens: prev.promptTokens + curr.promptTokens,
			completionTokens: prev.completionTokens + curr.completionTokens,
			totalTokens: prev.totalTokens + curr.totalTokens,
			isEstimate: prev.isEstimate || curr.isEstimate,
		};
	}

	return {
		itemIndex,
		previousRequests,
		iterationCount: currentIterationCount + 1,
		accumulatedTokens,
	};
}
