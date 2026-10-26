/** Utilization at which new production executions start to wait. */
export const HOLD_LEVEL = 0.8;

/** Utilization below which the hold ends. */
export const RESUME_LEVEL = 0.75;

/** Utilization at which the guard stops the execution that holds the most run data. */
export const STOP_LEVEL = 0.85;

/** Utilization at which one sample is enough to hold and to stop. */
export const CRITICAL_LEVEL = 0.95;

/** Utilization below which the guard samples slowly. */
export const FAST_SAMPLING_LEVEL = 0.7;

export const FAST_INTERVAL_MS = 250;

export const SLOW_INTERVAL_MS = 2_000;

/** How long the guard samples fast after a hold ends, because held executions then start. */
export const FAST_SAMPLING_AFTER_HOLD_MS = 5_000;

/** Consecutive samples at a level before the guard acts on it. */
export const SAMPLES_TO_ACT = 2;

/**
 * Longest wait of a held execution before the guard stops the execution that holds the
 * most run data. The wait counts again from each stop, so these stops are at least this far apart.
 */
export const HOLD_LIMIT_MS = 30_000;

/**
 * During a hold with nothing running, the guard lets one held execution start this often at
 * most. An execution shows as running only after a database write, which can take longer
 * than one sample.
 */
export const STARVATION_ADMIT_INTERVAL_MS = 1_000;

/**
 * Least time between two batches of held executions after a hold. A started execution
 * needs this time before memory shows what it uses.
 */
export const ADMIT_INTERVAL_MS = 1_000;

/** Longest wait for the engines of a stopped execution tree to end. */
export const RELEASE_TIMEOUT_MS = 5_000;

/**
 * Longest time to measure memory again after a stop. The save of a stopped execution
 * still holds its run data for a short time after its engine ends.
 */
export const REMEASURE_TIMEOUT_MS = 3_000;

export const REMEASURE_INTERVAL_MS = 500;

/** A stop frees memory if memory drops by at least this share of the stopped execution's estimate. */
export const FREED_SHARE = 0.5;

/** Number of counted stops after which the guard deactivates a workflow. */
export const STOPS_TO_DEACTIVATE = 3;

export const MEMORY_DOCS_URL =
	'https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/fix-memory-issues';
