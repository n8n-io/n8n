import type { RequestResponseMetadata } from '@utils/agent-execution';
import { NodeOperationError } from 'n8n-workflow';
import type { INode, EngineResponse } from 'n8n-workflow';

/**
 * Checks if the maximum iteration limit has been reached and throws an error if so.
 *
 * This function is called at the start of each agent execution to enforce
 * the maximum number of tool call iterations allowed.
 *
 * @param response - The engine response containing iteration metadata (if this is a continuation)
 * @param maxIterations - The maximum number of iterations allowed
 * @param node - The current node (for error context)
 * @throws {NodeOperationError} When the iteration count reaches or exceeds maxIterations
 *
 * @example
 * ```typescript
 * const response: EngineResponse<RequestResponseMetadata> = {
 *   // ... response data
 *   metadata: { iterationCount: 3 }
 * };
 *
 * // This will throw if iterationCount >= maxIterations
 * checkMaxIterations(response, 2, node);
 * ```
 */
export function checkMaxIterations(
	response: EngineResponse<RequestResponseMetadata> | undefined,
	maxIterations: number,
	node: INode,
): void {
	// Only check if this is a continuation (response has iteration count)
	if (response?.metadata?.iterationCount === undefined) {
		return;
	}

	if (response.metadata.iterationCount >= maxIterations) {
		throw new NodeOperationError(
			node,
			`Max iterations (${maxIterations}) reached. The agent could not complete the task within the allowed number of iterations.`,
		);
	}
}
