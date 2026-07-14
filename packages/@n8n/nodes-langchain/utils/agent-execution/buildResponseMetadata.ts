import type { EngineResponse } from 'n8n-workflow';

import { buildSteps } from './buildSteps';
import type { RequestResponseMetadata } from './types';

/**
 * Builds metadata for an engine request, tracking iteration count and previous requests.
 *
 * This helper centralizes the logic for incrementing iteration count and building
 * the request history, which is used to enforce max iterations and maintain context.
 *
 * @param response - The optional engine response from previous tool execution
 * @param itemIndex - The current item index being processed
 * @returns Metadata object with previousRequests and iterationCount
 *
 */
export async function buildResponseMetadata(
	response: EngineResponse<RequestResponseMetadata> | undefined,
	itemIndex: number,
): Promise<RequestResponseMetadata> {
	const currentIterationCount = response?.metadata?.iterationCount ?? 0;

	return {
		previousRequests: await buildSteps(response, itemIndex),
		itemIndex,
		iterationCount: currentIterationCount + 1,
	};
}
