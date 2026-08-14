import { ScheduledJobMisfirePolicy } from '@n8n/constants';

import type { PlannedJob } from './transaction';

interface GroupMember {
	entry: PlannedJob;
	latestMissedAt: number;
}

/**
 * Applies `coalesce_owner` across one planning pass: per owner, only the job
 * with the latest missed occurrence keeps its late run; the other jobs drop
 * theirs. Jobs on another policy, without an owner, or with nothing missed
 * are left untouched.
 */
export function applyCoalesceOwnerPolicy(planned: PlannedJob[]): PlannedJob[] {
	const losers = new Set(
		[...groupByOwner(planned).values()].flatMap((members) => {
			const winner = members.reduce(latestThenLowestId);
			return members.filter((member) => member !== winner).map((member) => member.entry);
		}),
	);

	if (losers.size === 0) {
		return planned;
	}
	return planned.map((entry) => (losers.has(entry) ? dropLateRun(entry) : entry));
}

/**
 * Grouped by `ownerKey` alone: `coalesce_owner` keeps one late run across an
 * owner's rules unconditionally, so the whole trigger fires once, however
 * many rules missed occurrences. Per-rule deduplication isn't this policy's
 * job: plain `coalesce` already keeps one late run per job, and
 * distinguishing rules is a workflow-definition concern, not a misfire one.
 */
function groupByOwner(planned: PlannedJob[]): Map<string, GroupMember[]> {
	return planned
		.flatMap(toOwnedMember)
		.reduce(
			(groups, { key, member }) => groups.set(key, [...(groups.get(key) ?? []), member]),
			new Map<string, GroupMember[]>(),
		);
}

/** Empty when the policy does not touch the job: no owner, another policy, or nothing missed. */
function toOwnedMember(entry: PlannedJob): Array<{ key: string; member: GroupMember }> {
	const { job, plan } = entry;
	if (
		job.ownerKey === null ||
		plan.catchUpAt === null ||
		job.misfirePolicy !== ScheduledJobMisfirePolicy.CoalesceOwner
	) {
		return [];
	}
	return [{ key: job.ownerKey, member: { entry, latestMissedAt: plan.catchUpAt.getTime() } }];
}

function latestThenLowestId(current: GroupMember, candidate: GroupMember): GroupMember {
	if (candidate.latestMissedAt !== current.latestMissedAt) {
		return candidate.latestMissedAt > current.latestMissedAt ? candidate : current;
	}
	return candidate.entry.job.id < current.entry.job.id ? candidate : current;
}

/**
 * Removes the loser's late run from its plan. `nextRunAt`/`lastFiredAt` stay
 * as already planned: the loser's clock still has to advance past its
 * backlog, or it reclaims the same backlog next pass. `retireBefore` also
 * stays, so its already-recorded pending occurrence still retires even though
 * it no longer runs late.
 */
function dropLateRun({ job, plan }: PlannedJob): PlannedJob {
	return {
		job,
		plan: {
			...plan,
			occurrences: plan.occurrences.slice(1),
			catchUpAt: null,
		},
	};
}
