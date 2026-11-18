import type { IWorkflowSettings } from 'n8n-workflow';

/** Task type that routes durable-scheduler occurrences to the auto-retry handler. */
export const EXECUTION_AUTO_RETRY_TASK_TYPE = 'execution-auto-retry';

/** Seconds to wait before each retry. Its length is the retry limit of a chain. */
export const RETRY_WAITS_SECONDS = [10, 10, 10, 10] as const;

/** Job names are unique across all owners, so the name repeats the workflow and the execution. */
export function autoRetryJobName(workflowId: string, executionId: string): string {
	return `auto-retry:${workflowId}:${executionId}`;
}

export const isAutoRetryEnabled = (settings: IWorkflowSettings | null | undefined): boolean =>
	settings?.autoRetry?.enabled === true;

/** The owner member that holds the retry job of one failed execution. */
export function autoRetryMemberId(executionId: string): string {
	return `auto-retry:${executionId}`;
}

/** Carries the workflow too, so the handler can delete its job after the execution is pruned. */
export interface AutoRetryJobPayload {
	workflowId: string;
	executionId: string;
}

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value !== '';

export const isAutoRetryJobPayload = (
	payload: Record<string, unknown>,
): payload is Record<string, unknown> & AutoRetryJobPayload =>
	isNonEmptyString(payload.workflowId) && isNonEmptyString(payload.executionId);
