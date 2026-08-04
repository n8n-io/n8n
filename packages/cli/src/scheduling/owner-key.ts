import type { ScheduledJob as ScheduledJobEntity } from '@n8n/db';

type JobOwner = Pick<ScheduledJobEntity, 'workflowId' | 'nodeId'>;

type OwnedJob<T extends JobOwner> = T & { ownerKey: string | null };

export function ownerKeyFor(job: JobOwner): string | null {
	if (job.workflowId === null || job.nodeId === null) return null;
	return `${job.workflowId}:${job.nodeId}`;
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
