import type { OccurrencePlan } from './plan';
import type { ScheduledJob } from '../types';

export interface PlannedJob {
	job: ScheduledJob;
	plan: OccurrencePlan;
}

export interface DueJobs {
	/**
	 * The clock's current time at the moment of claiming.
	 * The sweep plans occurrences relative to this, never an instance's own clock,
	 * so every instance agrees on "now".
	 */
	now: Date;

	/** The claimed jobs, earliest next run first. */
	jobs: ScheduledJob[];
}

/**
 * The operations a sweep performs, all bound to one transaction.
 */
export interface SweepTransaction {
	/**
	 * @returns up to `limit` enabled jobs whose next run is due, oldest first, locking
	 * them so a concurrent sweep claims different jobs, with the database time they were
	 * judged due at; `undefined` when nothing is due.
	 */
	claimDueJobs(limit: number): Promise<DueJobs | undefined>;

	/**
	 * Record every planned occurrence across all jobs in one batch,
	 * skipping any that already exist (identity is the job and its instant).
	 * This is the idempotent step: recording the same occurrence twice is a no-op.
	 * @returns how many occurrences were actually recorded
	 */
	recordOccurrences(planned: PlannedJob[]): Promise<number>;

	/**
	 * Advance every job's next-run and last-fired time in one batch.
	 */
	advanceJobs(planned: PlannedJob[]): Promise<void>;
}

/**
 * Runs one unit of sweep work inside a single transaction,
 * handing it a {@link SweepTransaction} bound to that transaction.
 * The storage layer supplies the real implementation.
 */
export type RunInTransaction = <T>(work: (tx: SweepTransaction) => Promise<T>) => Promise<T>;
