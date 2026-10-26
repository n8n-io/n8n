/** The owner columns a job carries, the shape its group key is built from. */
export interface ScheduledJobOwner {
	ownerType: string;
	ownerId: string;
	ownerMemberId: string | null;
}

type OwnedJob<T extends ScheduledJobOwner> = T & { ownerKey: string };

/**
 * The misfire-coalescing group key of a job, derived from its owner alone.
 *
 * Jobs that share an owner *member* group: a Schedule Trigger node's rules all
 * coalesce into one late run under `coalesce_owner`. A self-owned job (a system
 * task, whose `ownerId` is its own name) is its own group, so unrelated system
 * jobs never coalesce together.
 *
 * Never derived from the job's `name`: that carries the per-rule fingerprint,
 * and using it would make every group a singleton.
 *
 * @returns an opaque key, only ever compared for equality.
 */
export function ownerKeyFor(job: ScheduledJobOwner): string {
	return [job.ownerType, job.ownerId, job.ownerMemberId].map(lengthPrefixed).join('');
}

function lengthPrefixed(part: string | null): string {
	return part === null ? '-:' : `${part.length}:${part}`;
}

export function withOwnerKeys<T extends ScheduledJobOwner>(claimed: {
	now: Date;
	jobs: T[];
}): { now: Date; jobs: Array<OwnedJob<T>> } {
	return {
		now: claimed.now,
		jobs: claimed.jobs.map((job) => ({ ...job, ownerKey: ownerKeyFor(job) })),
	};
}
