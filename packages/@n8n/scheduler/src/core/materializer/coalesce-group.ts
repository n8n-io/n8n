import { ScheduledJobMisfirePolicy } from '@n8n/constants';

import type { PlannedJob } from './transaction';

interface GroupMember {
	entry: PlannedJob;
	catchUpAt: number;
}

export function coalesceSiblingCatchUps(planned: PlannedJob[]): PlannedJob[] {
	const losers = new Set<PlannedJob>();

	for (const members of groupOwnerCatchUps(planned).values()) {
		if (members.length < 2) continue;
		const winner = members.reduce(latestThenLowestId);
		for (const member of members) {
			if (member === winner) continue;
			losers.add(member.entry);
		}
	}

	if (losers.size === 0) return planned;
	return planned.map((entry) => (losers.has(entry) ? dropCatchUp(entry) : entry));
}

function ownerCatchUpAt({ job, plan }: PlannedJob): Date | null {
	if (job.ownerKey === null || job.misfirePolicy !== ScheduledJobMisfirePolicy.CoalesceOwner) {
		return null;
	}
	return plan.catchUpAt;
}

/**
 * Grouped by `ownerKey` alone: `coalesce_owner` collapses catch-up runs across
 * an owner's rules unconditionally, so the whole trigger fires once, however
 * many rules missed occurrences. Per-rule deduplication isn't this policy's
 * job: plain `coalesce` already collapses backlog within a single job, and
 * distinguishing rules is a workflow-definition concern, not a misfire one.
 */
function groupOwnerCatchUps(planned: PlannedJob[]): Map<string, GroupMember[]> {
	const groups = new Map<string, GroupMember[]>();

	for (const entry of planned) {
		const catchUpAt = ownerCatchUpAt(entry);
		if (catchUpAt === null) continue;

		const key = entry.job.ownerKey;
		if (key === null) continue;

		const member: GroupMember = { entry, catchUpAt: catchUpAt.getTime() };
		const members = groups.get(key);
		if (members === undefined) groups.set(key, [member]);
		else members.push(member);
	}

	return groups;
}

function latestThenLowestId(current: GroupMember, candidate: GroupMember): GroupMember {
	if (candidate.catchUpAt > current.catchUpAt) return candidate;
	if (candidate.catchUpAt < current.catchUpAt) return current;
	return candidate.entry.job.id < current.entry.job.id ? candidate : current;
}

function dropCatchUp({ job, plan }: PlannedJob): PlannedJob {
	// `nextRunAt`/`lastFiredAt` stay as already planned: the loser's clock still
	// has to advance past its backlog, or it reclaims the same backlog next pass.
	// `retireBefore` also stays, so its already-recorded pending occurrence still
	// retires even though its catch-up is no longer recorded.
	return {
		job,
		plan: {
			...plan,
			occurrences: plan.occurrences.slice(1),
			catchUpAt: null,
		},
	};
}
