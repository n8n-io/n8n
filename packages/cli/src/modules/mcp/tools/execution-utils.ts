import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import { Time } from '@n8n/constants';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UnexpectedError, TimeoutExecutionCancelledError, type IRun } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { McpService } from '@/modules/mcp/mcp.service';

import { McpExecutionTimeoutError } from '../mcp.errors';

export const WORKFLOW_EXECUTION_TIMEOUT_MS = 5 * Time.minutes.toMilliseconds;

export const PROGRESS_HEARTBEAT_INTERVAL_MS = 3 * Time.seconds.toMilliseconds;

type ToolHandlerExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

/**
 * Streams MCP progress notifications while a workflow execution is awaited.
 * No-op when the client did not send a progress token with the tool call.
 * `total` is deliberately omitted: execution duration is unknown, and a total
 * would make clients render a meaningless completion percentage.
 */
export const createExecutionProgressReporter = (
	extra: ToolHandlerExtra | undefined,
	label: string,
) => {
	const progressToken = extra?._meta?.progressToken;
	let elapsedSeconds = 0;
	let heartbeat: NodeJS.Timeout | undefined;

	const send = (message: string) => {
		if (progressToken === undefined) return;
		void extra
			?.sendNotification({
				method: 'notifications/progress',
				params: { progressToken, progress: elapsedSeconds, message },
			})
			.catch(() => {}); // Client may have disconnected — progress is best-effort
	};

	return {
		start: () => {
			if (progressToken === undefined) return;
			send(`${label} started`);
			heartbeat = setInterval(() => {
				elapsedSeconds += PROGRESS_HEARTBEAT_INTERVAL_MS * Time.milliseconds.toSeconds;
				send(`${label} running — ${elapsedSeconds}s elapsed`);
			}, PROGRESS_HEARTBEAT_INTERVAL_MS);
		},
		update: send,
		stop: () => clearInterval(heartbeat),
	};
};

/**
 * Wait for a workflow execution to complete, with timeout and queue mode support.
 * Shared between execute_workflow and test_workflow tools.
 * `cancelOnTimeout: false` leaves the execution running when the wait times
 * out — used by execute_workflow, where the wait is a convenience and must not
 * kill a (possibly production) run as a side effect.
 */
export const waitForExecutionResult = async (
	executionId: string,
	activeExecutions: ActiveExecutions,
	mcpService: McpService,
	{ cancelOnTimeout = true }: { cancelOnTimeout?: boolean } = {},
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
			if (!cancelOnTimeout) {
				// The abandoned result promise may still settle once the execution
				// finishes; swallow it so it can't surface as an unhandled rejection.
				resultPromise.catch(() => {});
				throw error;
			}
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
