import { UserError } from 'n8n-workflow';

/**
 * True when `executionTimeout` is above the instance maximum (`EXECUTIONS_TIMEOUT_MAX`).
 */
export function exceedsMaxExecutionTimeout(
	executionTimeout: number | undefined,
	maxTimeout: number,
): boolean {
	// A `maxTimeout` of 0 or less means that the instance sets no cap.
	// An `executionTimeout` of 0 or less means that the workflow has no timeout.
	if (executionTimeout === undefined || executionTimeout <= 0 || maxTimeout <= 0) return false;
	return executionTimeout > maxTimeout;
}

/**
 * Rejects an `executionTimeout` above the instance maximum. The editor applies the
 * same limit in its settings modal; callers that write settings directly use this.
 */
export function assertExecutionTimeoutWithinMax(
	executionTimeout: number | undefined,
	maxTimeout: number,
): void {
	if (!exceedsMaxExecutionTimeout(executionTimeout, maxTimeout)) return;

	throw new UserError(
		`executionTimeout (${executionTimeout}s) exceeds this instance's maximum of ${maxTimeout}s. Set executionTimeout to ${maxTimeout} or less.`,
	);
}
