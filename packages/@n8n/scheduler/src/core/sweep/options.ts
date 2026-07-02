export interface SweepOptions {
	/**
	 * How far past `now` to create occurrences, in seconds. A fire due within this
	 * window is recorded ahead of time, so a schedule that fires several times a
	 * minute doesn't need a sweep per fire. Must be >= 0.
	 */
	windowSeconds: number;

	/**
	 * The most occurrences to create for one job in one sweep. Caps the work when a
	 * job has fallen far behind (for example after downtime): the backlog is drained
	 * a batch per sweep rather than in one oversized transaction.
	 */
	maxPerJob: number;

	/**
	 * The most jobs to claim in one sweep, bounding a single sweep's transaction.
	 */
	batchSize: number;
}

export const DEFAULT_SWEEP_OPTIONS: SweepOptions = {
	windowSeconds: 60,
	batchSize: 100,
	maxPerJob: 1000,
};
