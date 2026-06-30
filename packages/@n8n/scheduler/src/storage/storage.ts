import type { ScheduledJob, ScheduledTask } from '../types';

/**
 * Storage port for the scheduler: the seam between the engine and persistence.
 *
 * Deliberately thin and provisional: it holds only what the schedule math and an
 * early sweep imply. The real contract (claiming, leasing, fencing, retention)
 * emerges with the storage adapter, which owns it. Do not grow this interface
 * here.
 */
export interface SchedulerStore {
	/**
	 * Fetch enabled jobs that are due to fire, for the sweep to materialise.
	 *
	 * @param now - Reference instant; a job is due when its `nextRunAt` is at or before this.
	 * @param limit - Maximum number of jobs to return, so one sweep claims a bounded batch.
	 * @returns The due jobs (at most `limit`).
	 */
	getDueJobs(now: Date, limit: number): Promise<ScheduledJob[]>;

	/**
	 * Persist a job's advanced scheduling state after the sweep has fired it.
	 *
	 * @param job - The job carrying the updated `nextRunAt` and `lastFiredAt`.
	 */
	saveJob(job: ScheduledJob): Promise<void>;

	/**
	 * Enqueue a materialised occurrence for the executor to claim and run.
	 *
	 * @param task - The occurrence to insert; identity is unique on `(jobId, scheduledFor)`.
	 */
	createTask(task: ScheduledTask): Promise<void>;
}
