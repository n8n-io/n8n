export interface SweepOptions {
	/**
	 * How far past `now` to create occurrences, in seconds. A fire due within this
	 * window is recorded ahead of time, so a schedule that fires several times a
	 * minute doesn't need a sweep per fire. Must be >= 0.
	 *
	 * The window is also how long a disable or edit can lag: occurrences already
	 * materialized ahead are not retracted by the sweep, so a fire up to this far
	 * out can still run afterwards unless the job-write path cancels pending tasks.
	 */
	windowSeconds: number;

	/**
	 * The most occurrences to create for one job in one sweep. Caps the work when a
	 * job has fallen far behind (for example after downtime): the backlog is drained
	 * a batch per sweep rather than in one oversized transaction. Every backlog
	 * occurrence is still recorded, at its original past instant; whether stale
	 * candidates run or are marked missed is the dispatcher's policy.
	 */
	maxPerJob: number;

	/**
	 * The most jobs to claim in one sweep, bounding a single sweep's transaction.
	 */
	batchSize: number;

	/**
	 * How long to defer a job whose schedule cannot be planned (for example an
	 * unresolvable timezone) before the sweep tries it again, in seconds. Deferring
	 * keeps the job in the normal claim cycle: a transient cause (instance timezone
	 * misconfiguration, tzdata drift) self-heals on a later sweep, and a permanently
	 * broken schedule surfaces one plan error per retry instead of wedging or being
	 * silently dropped.
	 */
	planRetrySeconds: number;
}

export const DEFAULT_SWEEP_OPTIONS: SweepOptions = {
	windowSeconds: 60,
	batchSize: 100,
	maxPerJob: 1000,
	planRetrySeconds: 3600,
};
