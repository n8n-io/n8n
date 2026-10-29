import type { ExecutionRedactionServiceProxy, RedactableExecution } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	OperationalError,
	UnexpectedError,
	TimeoutExecutionCancelledError,
	WorkflowOperationError,
	type ExecutionError,
	type IRedactedErrorInfo,
	type IRun,
	type IRunData,
	type IRunExecutionData,
	type IWorkflowBase,
	type IWorkflowExecutionDataProcess,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

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

type RunErrorSource = {
	executionId?: string;
	mode: WorkflowExecuteMode;
	workflowId: string;
	workflowData: Pick<IWorkflowBase, 'settings' | 'nodes'>;
	/** Run data of the execution. Omit it when no run data exists. */
	data?: Pick<IRunExecutionData, 'resultData' | 'executionData'>;
	error: ExecutionError;
};

/**
 * Applies execution redaction to the error of a workflow run, the same way
 * `get_workflow_execution` redacts execution data. Returns a message without
 * error details when redaction hides the run data from the user. Returns
 * `undefined` when the user may see the error.
 */
export async function getRedactedRunErrorMessage(
	executionRedactionServiceProxy: ExecutionRedactionServiceProxy,
	user: User,
	source: RunErrorSource,
): Promise<string | undefined> {
	// Redaction changes the execution in place. Give it copies that hold only
	// the fields it reads, so the run result stays unchanged.
	const executionData = source.data?.executionData;
	const execution: RedactableExecution = {
		id: source.executionId,
		mode: source.mode,
		workflowId: source.workflowId,
		workflowData: source.workflowData,
		data: {
			resultData: {
				runData: copyTaskFlags(source.data?.resultData.runData),
				error: source.error,
			},
			executionData: executionData && {
				contextData: {},
				runtimeData: executionData.runtimeData && { ...executionData.runtimeData },
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: null,
			},
		},
	};

	await executionRedactionServiceProxy.processExecution(execution, { user });

	const { redactedError } = execution.data.resultData;
	return redactedError ? formatRedactedError(redactedError) : undefined;
}

/**
 * Applies execution redaction to an error that stopped a workflow run before
 * it started. Returns the error to show to the user.
 */
export async function redactRunStartError(
	executionRedactionServiceProxy: ExecutionRedactionServiceProxy,
	user: User,
	runData: IWorkflowExecutionDataProcess,
	error: unknown,
): Promise<Error> {
	const original = ensureError(error);
	const executionError = new WorkflowOperationError(original.message);
	executionError.name = original.name;
	// Redaction keeps the HTTP status code of a `NodeApiError`.
	if ('httpCode' in original) {
		Object.assign(executionError, { httpCode: original.httpCode });
	}

	const redactedMessage = await getRedactedRunErrorMessage(executionRedactionServiceProxy, user, {
		mode: runData.executionMode,
		workflowId: runData.workflowData.id,
		workflowData: runData.workflowData,
		// The run can fail after it established the execution context. That
		// context holds the redaction snapshot and the dynamic credential flag.
		data: runData.executionData,
		error: executionError,
	});

	return redactedMessage ? new OperationalError(redactedMessage) : original;
}

/** Copies the task flags that redaction reads, without the task data. */
function copyTaskFlags(runData: IRunData | undefined): IRunData {
	const copy: IRunData = {};
	for (const [nodeName, tasks] of Object.entries(runData ?? {})) {
		copy[nodeName] = tasks.map((task) => ({
			...task,
			data: undefined,
			inputOverride: undefined,
			error: undefined,
		}));
	}
	return copy;
}

/** Redaction keeps only the error type and the HTTP status code. */
function formatRedactedError({ type, httpCode }: IRedactedErrorInfo): string {
	const details = [type, httpCode ? `HTTP ${httpCode}` : undefined].filter(Boolean).join(', ');
	return `Error details hidden by execution data redaction${details ? ` (${details})` : ''}`;
}
