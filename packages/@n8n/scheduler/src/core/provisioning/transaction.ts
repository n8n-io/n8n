import type { DesiredJob, ExistingJob, ScheduleDefinition } from './types';

/**
 * The writes one provision performs, all bound to one transaction. The storage
 * layer supplies the implementation; the domain {@link provision} orchestrates
 * these calls but never opens the transaction itself (mirrors the materializer's
 * {@link RunInTransaction}).
 */
export interface ProvisionTransaction {
	/** Every job currently in the scope, so provisioning can diff by name. */
	findExisting(): Promise<ExistingJob[]>;
	/**
	 * Insert brand-new jobs (those whose name has no existing match).
	 * @returns their assigned ids, in the same order as `jobs`.
	 */
	insert(jobs: DesiredJob[]): Promise<number[]>;
	/** Rewrite a changed job in place, keeping its id and reseeding its clock. */
	redefine(jobId: number, schedule: ScheduleDefinition, nextRunAt: Date | null): Promise<void>;
	/** Withdraw the still-pending tasks of jobs whose definition changed. */
	withdrawPendingTasks(jobIds: number[]): Promise<void>;
	/** Delete jobs no longer desired; their tasks cascade away. */
	deleteJobs(jobIds: number[]): Promise<void>;
}

export type RunInProvisionTransaction = <T>(
	work: (tx: ProvisionTransaction) => Promise<T>,
) => Promise<T>;

/** The single write one deprovision performs, bound to one transaction. */
export interface DeprovisionTransaction {
	/** Delete every job in the scope; their tasks cascade. @returns how many were deleted. */
	deleteAll(): Promise<number>;
}

export type RunInDeprovisionTransaction = <T>(
	work: (tx: DeprovisionTransaction) => Promise<T>,
) => Promise<T>;
