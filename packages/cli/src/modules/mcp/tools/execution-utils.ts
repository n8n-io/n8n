import { Time } from '@n8n/constants';
import {
	UnexpectedError,
	TimeoutExecutionCancelledError,
	ensureError,
	type IRun,
} from 'n8n-workflow';

import { McpExecutionTimeoutError } from '../mcp.errors';

import type { ActiveExecutions } from '@/active-executions';
import type { McpService } from '@/modules/mcp/mcp.service';

export const WORKFLOW_EXECUTION_TIMEOUT_MS = 5 * Time.minutes.toMilliseconds;

/**
 * Wait for a workflow execution to complete, with timeout and queue mode support.
 * Shared between execute_workflow and test_workflow tools.
 */
export const waitForExecutionResult = async (
	executionId: string,
	activeExecutions: ActiveExecutions,
	mcpService: McpService,
): Promise<IRun> => {
	let timeoutId: NodeJS.Timeout | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new McpExecutionTimeoutError(executionId, WORKFLOW_EXECUTION_TIMEOUT_MS));
		}, WORKFLOW_EXECUTION_TIMEOUT_MS);
	});

	const resultPromise = mcpService.isQueueMode
		? mcpService.createPendingResponse(executionId).promise
		: activeExecutions.getPostExecutePromise(executionId);

	try {
		const data = await Promise.race([resultPromise, timeoutPromise]);
		clearTimeout(timeoutId);

		if (data === undefined) {
			throw new UnexpectedError('Workflow did not return any data');
		}

		return data;
	} catch (error) {
		if (timeoutId) clearTimeout(timeoutId);

		if (mcpService.isQueueMode) {
			mcpService.removePendingResponse(executionId);
		}

		if (error instanceof McpExecutionTimeoutError) {
			// Known limitation: In queue mode, activeExecutions.stopExecution() only affects
			// local executions. Remote worker executions require cancellation via
			// ScalingService.stopJob() with a Bull Job reference, which is not available here.
			// This is a pre-existing gap in ExecutionService.stopInScalingMode() as well.
			try {
				const cancellationError = new TimeoutExecutionCancelledError(error.executionId!);
				activeExecutions.stopExecution(error.executionId!, cancellationError);
			} catch (stopError) {
				throw new UnexpectedError(
					`Failed to stop timed-out execution [id: ${error.executionId}]: ${ensureError(stopError).message}`,
				);
			}
		}
		throw error;
	}
};
