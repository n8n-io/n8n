import type { ClaimedTask } from '../core/types';

/**
 * `n8n.scheduler.*` span attribute names, kept in one place so every scheduler
 * span reports the same keys and Sentry queries stay stable.
 */
export const SCHEDULER_ATTRIBUTES = {
	taskId: 'n8n.scheduler.task_id',
	jobId: 'n8n.scheduler.job_id',
	taskType: 'n8n.scheduler.task_type',
	host: 'n8n.scheduler.host',
	leaseEpoch: 'n8n.scheduler.lease_epoch',
	scheduledFor: 'n8n.scheduler.scheduled_for',
	runAt: 'n8n.scheduler.run_at',
	attempts: 'n8n.scheduler.attempts',
	maxAttempts: 'n8n.scheduler.max_attempts',
	outcome: 'n8n.scheduler.outcome',
	claimedCount: 'n8n.scheduler.claimed_count',
	reclaimed: 'n8n.scheduler.reclaimed',
	deadLettered: 'n8n.scheduler.dead_lettered',
	claimedJobs: 'n8n.scheduler.claimed_jobs',
	occurrences: 'n8n.scheduler.occurrences',
	deferredJobs: 'n8n.scheduler.deferred_jobs',
	retentionDeleted: 'n8n.scheduler.retention_deleted',
	retentionDrained: 'n8n.scheduler.retention_drained',
	provisionInserted: 'n8n.scheduler.provision_inserted',
	provisionRedefined: 'n8n.scheduler.provision_redefined',
	provisionUnchanged: 'n8n.scheduler.provision_unchanged',
	provisionRemoved: 'n8n.scheduler.provision_removed',
	deprovisionRemoved: 'n8n.scheduler.deprovision_removed',
	jobName: 'n8n.scheduler.job_name',
	jobAction: 'n8n.scheduler.job_action',
} as const;

/**
 * Values of the {@link SCHEDULER_ATTRIBUTES.jobAction} attribute on a per-job
 * provision span: what one provision did to that job, so a trace tells a fresh
 * insert apart from a rewrite apart from a deletion. Unchanged jobs get no span.
 */
export const SCHEDULER_PROVISION_ACTION = {
	/** The job did not exist and was inserted. */
	inserted: 'inserted',
	/** The job existed with a different definition and was rewritten in place. */
	redefined: 'redefined',
	/** The job was no longer desired and was deleted. */
	removed: 'removed',
} as const;

/**
 * Values of the {@link SCHEDULER_ATTRIBUTES.outcome} attribute on a fire span:
 * how firing one task ended, so a trace tells a retry apart from a terminal
 * dead-letter and both apart from a skip.
 */
export const SCHEDULER_FIRE_OUTCOME = {
	/** The handler ran and the task completed. */
	completed: 'completed',
	/** The handler threw and the task was rescheduled for another attempt. */
	rescheduled: 'rescheduled',
	/** The handler threw on its last attempt and the task failed terminally. */
	deadLettered: 'dead_lettered',
	/** No handler was registered for the type; the claim was released. */
	skippedNoHandler: 'skipped_no_handler',
	/** The row was gone or reclaimed by the time it fired; nothing dispatched. */
	skippedNotOwned: 'skipped_not_owned',
} as const;

/**
 * Per-occurrence attributes shared by the fire/handoff spans. `ClaimedTask`
 * carries no workflow id, so the identity is `job_id` + `task_id` only.
 */
export function pickSchedulerTaskAttributes(task: ClaimedTask): Record<string, string | number> {
	return {
		[SCHEDULER_ATTRIBUTES.taskId]: task.id,
		[SCHEDULER_ATTRIBUTES.jobId]: task.jobId,
		[SCHEDULER_ATTRIBUTES.taskType]: task.taskType,
		[SCHEDULER_ATTRIBUTES.leaseEpoch]: task.leaseEpoch,
		[SCHEDULER_ATTRIBUTES.attempts]: task.attempts,
		[SCHEDULER_ATTRIBUTES.maxAttempts]: task.maxAttempts,
		[SCHEDULER_ATTRIBUTES.scheduledFor]: task.scheduledFor.toISOString(),
		[SCHEDULER_ATTRIBUTES.runAt]: task.runAt.toISOString(),
	};
}
