import { UserError } from 'n8n-workflow';

/**
 * True when `executionTimeout` is above the instance maximum (`EXECUTIONS_TIMEOUT_MAX`).
 * A non-positive `maxTimeout` means the instance sets no cap, and a non-positive
 * `executionTimeout` is the "unlimited" sentinel (-1), so neither is ever above it.
 */
export function exceedsMaxExecutionTimeout(
	executionTimeout: number | undefined,
	maxTimeout: number,
): boolean {
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
