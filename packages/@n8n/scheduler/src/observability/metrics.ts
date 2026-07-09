/**
 * Minimal metrics port. The scheduler stays dependency-light: it depends on this
 * interface and records counts and timings through it, while the host adapts its
 * concrete (Prometheus-backed) metrics to it. Push-based: the scheduler calls a
 * method per event, so the port exposes no reader or registry API.
 */
export interface SchedulerMetrics {
	/** A claimed task is about to be dispatched to its handler. */
	recordDispatch(taskType: string): void;
	/** A dispatch reached a terminal outcome (completed, or failed with no attempts left). */
	recordFireOutcome(taskType: string, result: 'success' | 'failure'): void;
	/** A failed dispatch was rescheduled for another attempt. */
	recordRetry(taskType: string): void;
	/** Delay between when a task was due (`scheduledFor`) and when it actually fired. */
	observeDispatchLagSeconds(taskType: string, seconds: number): void;

	/** Outcome of one materialization pass. */
	recordMaterialized(occurrences: number, deferredJobs: number): void;
	/** Outcome of one reaper sweep. */
	recordReaped(reclaimed: number, deadLettered: number): void;
	/**
	 * A task became a dead-letter on the executor's terminal-failure path (attempts
	 * exhausted). Complements the reaper's `recordReaped`, which counts the ones it
	 * dead-letters.
	 */
	recordDeadLettered(): void;
	/** Outcome of one retention pass. */
	recordPruned(deleted: number): void;
}

/** Default metrics: records nothing. */
export const noopMetrics: SchedulerMetrics = {
	recordDispatch() {},
	recordFireOutcome() {},
	recordRetry() {},
	observeDispatchLagSeconds() {},
	recordMaterialized() {},
	recordReaped() {},
	recordDeadLettered() {},
	recordPruned() {},
};
