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
	/** Enabled jobs whose `nextRunAt` is due at or before `now`, capped at `limit`. */
	getDueJobs(now: Date, limit: number): Promise<ScheduledJob[]>;

	/** Persist a job's advanced scheduling state (`nextRunAt`, `lastFiredAt`). */
	saveJob(job: ScheduledJob): Promise<void>;

	/** Enqueue a materialised occurrence for a job. */
	createTask(task: ScheduledTask): Promise<void>;
}
