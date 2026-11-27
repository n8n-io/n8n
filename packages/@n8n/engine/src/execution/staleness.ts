import { UnexpectedError } from '../common';

/**
 * How long a row can stay in one status before the engine treats it as stuck.
 * The stores add the threshold to the current time at each transition, and
 * they write the result in the `stale_after` column of the row.
 */
export interface StalenessThresholds {
	/**
	 * For a row whose message waits on a queue: an execution or a step that is
	 * `queued`, and a settled step whose `step:settled` message the orchestration
	 * worker has not handled.
	 */
	queuedMs: number;
	/**
	 * For a step that is `running`. The engine fails a step that runs longer, so
	 * the value must be larger than the run time of the slowest healthy node.
	 */
	runningStepMs: number;
	/**
	 * For an ended execution whose error execution has not started. The worker
	 * that ended it starts the error execution at once, so the repair waits this
	 * long before it tries, and as long again after each failed try.
	 */
	errorWorkflowPendingMs?: number;
}

const DEFAULT_ERROR_WORKFLOW_PENDING_MS = 60_000;

export const DEFAULT_STALENESS_THRESHOLDS: StalenessThresholds = {
	queuedMs: 60_000,
	// Ten minutes: the engine fails a step that is `running` past this time, and
	// it cannot tell a slow node from a stopped worker. A low value fails healthy nodes.
	runningStepMs: 600_000,
	errorWorkflowPendingMs: DEFAULT_ERROR_WORKFLOW_PENDING_MS,
};

/** Advance past the observed deadline so it cannot match a second renewal. */
export function nextQueuedStaleAfter(observed: Date, now: number, queuedMs: number): Date {
	return new Date(Math.max(now + queuedMs, observed.getTime() + 1));
}

/** The wait before the repair tries to start a pending error execution. */
export function errorWorkflowPendingMs(thresholds: StalenessThresholds): number {
	return thresholds.errorWorkflowPendingMs ?? DEFAULT_ERROR_WORKFLOW_PENDING_MS;
}

/** Throws when a threshold is not a positive whole number of milliseconds. */
export function assertValidStalenessThresholds(thresholds: StalenessThresholds): void {
	// Only the optional threshold has a default. A required one must be set.
	const resolved = { ...thresholds, errorWorkflowPendingMs: errorWorkflowPendingMs(thresholds) };
	const invalid = Object.entries(resolved).find(([, ms]) => !Number.isSafeInteger(ms) || ms <= 0);
	if (invalid) {
		throw new UnexpectedError(
			`The staleness threshold "${invalid[0]}" must be a positive whole number of milliseconds`,
		);
	}
}
