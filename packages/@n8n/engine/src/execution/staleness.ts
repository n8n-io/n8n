import { UnexpectedError } from '../common';

/**
 * How long a row can stay in one status before the engine treats it as stuck.
 * The stores add the threshold to the current time at each transition, and
 * they write the result in the `stale_after` column of the row.
 */
export interface StalenessThresholds {
	/** For an execution or a step that is `queued`. */
	queuedMs: number;
	/**
	 * For a step that is `running`. The engine fails a step that runs longer, so
	 * the value must be larger than the run time of the slowest healthy node.
	 */
	runningStepMs: number;
}

export const DEFAULT_STALENESS_THRESHOLDS: StalenessThresholds = {
	queuedMs: 60_000,
	// Ten minutes: the engine fails a step that is `running` past this time, and
	// it cannot tell a slow node from a stopped worker. A low value fails healthy nodes.
	runningStepMs: 600_000,
};

/** Throws when a threshold is not a positive whole number of milliseconds. */
export function assertValidStalenessThresholds(thresholds: StalenessThresholds): void {
	const invalid = Object.entries(thresholds).find(([, ms]) => !Number.isSafeInteger(ms) || ms <= 0);
	if (invalid) {
		throw new UnexpectedError(
			`The staleness threshold "${invalid[0]}" must be a positive whole number of milliseconds`,
		);
	}
}
