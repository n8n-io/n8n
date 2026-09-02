import type { ScheduledJob as ScheduledJobEntity } from '@n8n/db';

type JobOwner = Pick<ScheduledJobEntity, 'workflowId' | 'nodeId'>;

type OwnedJob<T extends JobOwner> = T & { ownerKey: string | null };

/**
 * `null` when either id is missing. Derived only from `workflowId`/`nodeId`,
 * never the job's `name`: that carries the per-rule fingerprint, and using it
 * would make every group a singleton.
 */
export function ownerKeyFor(job: JobOwner): string | null {
	if (job.workflowId === null || job.nodeId === null) {
		return null;
	}
	return `${job.workflowId}\0${job.nodeId}`;
}

export function withOwnerKeys<T extends JobOwner>(claimed: {
	now: Date;
	jobs: T[];
}): { now: Date; jobs: Array<OwnedJob<T>> } {
	return {
		now: claimed.now,
		jobs: claimed.jobs.map((job) => ({ ...job, ownerKey: ownerKeyFor(job) })),
	};
}
