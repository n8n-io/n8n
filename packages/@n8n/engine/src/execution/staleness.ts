/**
 * How long a row can stay in one status before the engine treats it as stuck.
 * The stores add the threshold to the current time at each transition, and
 * they write the result in the `stale_after` column of the row.
 */
export interface StalenessThresholds {
	/** For an execution or a step that is `queued`. */
	queuedMs: number;
	/** For a step that is `running`. */
	runningStepMs: number;
}

export const DEFAULT_STALENESS_THRESHOLDS: StalenessThresholds = {
	queuedMs: 60_000,
	runningStepMs: 60_000,
};
