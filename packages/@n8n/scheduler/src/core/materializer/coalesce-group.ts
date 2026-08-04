import { ScheduledJobMisfirePolicy } from '@n8n/constants';

import type { PlannedJob } from './transaction';

interface GroupMember {
	entry: PlannedJob;
	catchUpAt: number;
}

export function coalesceSiblingCatchUps(planned: PlannedJob[]): PlannedJob[] {
	const groups = groupByOwnerAndTaskType(planned);
	const losers = new Set<PlannedJob>();

	for (const byTaskType of groups.values()) {
		for (const members of byTaskType.values()) {
			if (members.length < 2) continue;
			const winner = members.reduce(latestThenLowestId);
			for (const member of members) {
				if (member === winner) continue;
				if (member.entry.plan.nextRunAt === null) continue;
				losers.add(member.entry);
			}
		}
	}

	if (losers.size === 0) return planned;
	return planned.map((entry) => (losers.has(entry) ? dropCatchUp(entry) : entry));
}

function groupByOwnerAndTaskType(planned: PlannedJob[]): Map<string, Map<string, GroupMember[]>> {
	const groups = new Map<string, Map<string, GroupMember[]>>();

	for (const entry of planned) {
		const { ownerKey, taskType, misfirePolicy } = entry.job;
		if (ownerKey === null) continue;
		if (misfirePolicy !== ScheduledJobMisfirePolicy.CoalesceOwner) continue;
		const { catchUpAt } = entry.plan;
		if (catchUpAt === null) continue;

		let byTaskType = groups.get(ownerKey);
		if (byTaskType === undefined) {
			byTaskType = new Map<string, GroupMember[]>();
			groups.set(ownerKey, byTaskType);
		}
		const members = byTaskType.get(taskType);
		const member: GroupMember = { entry, catchUpAt: catchUpAt.getTime() };
		if (members === undefined) byTaskType.set(taskType, [member]);
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
	return {
		job,
		plan: {
			...plan,
			occurrences: plan.occurrences.slice(1),
			catchUpAt: null,
			groupedCatchUps: plan.groupedCatchUps + 1,
		},
	};
}
