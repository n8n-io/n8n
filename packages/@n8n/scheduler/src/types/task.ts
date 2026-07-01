/**
 * The allocated unit of work. Coordination (the scheduler's core) claims, leases,
 * and runs each `ScheduledTask` exactly once on one main; recurrence is just one
 * way these come to exist.
 *
 * Field names mirror the `scheduled_task` columns so the storage adapter maps
 * trivially. Instants are `Date` (absolute UTC).
 */

/**
 * Occurrence lifecycle (`scheduled_task.status`) as a runtime list, so the schema
 * column and validation share one source of truth.
 */
export const TaskStatusList = [
	'pending',
	'running',
	'succeeded',
	'failed',
	'missed',
	'cancelled',
] as const;
export type TaskStatus = (typeof TaskStatusList)[number];

/**
 * A materialised occurrence of a job (`scheduled_task`): one queued run.
 *
 * `scheduledFor` is the canonical UTC occurrence instant and the identity (unique
 * on `(jobId, scheduledFor)`); `runAt` is the visibility time (equal to
 * `scheduledFor` initially, pushed forward by retry backoff). Coordination fields
 * (owner, lease, fencing) are added with the claim and reaper work.
 */
export interface ScheduledTask {
	id: string;
	jobId: string;
	taskType: string;
	payload: unknown;
	scheduledFor: Date;
	runAt: Date;
	status: TaskStatus;
	attempts: number;
	maxAttempts: number;
}
