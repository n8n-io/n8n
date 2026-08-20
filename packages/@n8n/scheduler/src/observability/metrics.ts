import type { MisfireCount } from '../core/materializer/materialize';

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
	/**
	 * A handler finished after its lease was reclaimed, so another instance may
	 * have run the same occurrence concurrently.
	 */
	recordLeaseLost(taskType: string): void;

	/** Outcome of one materialization pass. */
	recordMaterialized(occurrences: number, deferredJobs: number): void;
	/** Occurrences a misfire policy discarded before recording them. */
	recordMisfired(discarded: MisfireCount[]): void;
	/** Already-recorded occurrences retired because a catch-up run superseded them. */
	recordRetired(retired: number): void;
	/** Outcome of one reaper sweep. */
	recordReaped(reclaimed: number, deadLettered: number, missed: number): void;
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
	recordLeaseLost() {},
	recordMaterialized() {},
	recordMisfired() {},
	recordRetired() {},
	recordReaped() {},
	recordDeadLettered() {},
	recordPruned() {},
};
