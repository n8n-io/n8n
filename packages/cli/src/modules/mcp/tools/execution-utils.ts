import { Time } from '@n8n/constants';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UnexpectedError, TimeoutExecutionCancelledError, type IRun } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { McpService } from '@/modules/mcp/mcp.service';

import { McpExecutionTimeoutError } from '../mcp.errors';

export const WORKFLOW_EXECUTION_TIMEOUT_MS = 5 * Time.minutes.toMilliseconds;

/** Default execution timeout, in seconds, exposed to MCP callers. */
export const WORKFLOW_EXECUTION_TIMEOUT_DEFAULT_SECONDS =
	WORKFLOW_EXECUTION_TIMEOUT_MS * Time.milliseconds.toSeconds;

/** Upper bound for a caller-provided execution timeout, in seconds. */
export const WORKFLOW_EXECUTION_TIMEOUT_MAX_SECONDS = 60 * Time.minutes.toSeconds;

/**
 * Wait for a workflow execution to complete, with timeout and queue mode support.
 * Shared between execute_workflow and test_workflow tools.
 *
 * @param timeoutMs - How long to wait before timing out. Defaults to
 * `WORKFLOW_EXECUTION_TIMEOUT_MS` (5 minutes).
 */
export const waitForExecutionResult = async (
	executionId: string,
	activeExecutions: ActiveExecutions,
	mcpService: McpService,
	timeoutMs: number = WORKFLOW_EXECUTION_TIMEOUT_MS,
): Promise<IRun> => {
	let timeoutId: NodeJS.Timeout | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new McpExecutionTimeoutError(executionId, timeoutMs));
		}, timeoutMs);
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
