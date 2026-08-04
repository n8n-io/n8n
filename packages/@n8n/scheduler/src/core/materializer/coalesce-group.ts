import { ScheduledJobMisfirePolicy } from '@n8n/constants';

import type { ScheduledJob } from '../types';
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
			if (member.entry.plan.nextRunAt === null && member.catchUpAt < winner.catchUpAt) continue;
			losers.add(member.entry);
		}
	}

	if (losers.size === 0) return planned;
	return planned.map((entry) => (losers.has(entry) ? dropCatchUp(entry) : entry));
}

export function countMultiMemberOwnerGroups(planned: PlannedJob[]): number {
	let groups = 0;
	for (const members of groupOwnerCatchUps(planned).values()) {
		if (members.length > 1) groups += 1;
	}
	return groups;
}

export function countRetainedOwnerCatchUps(planned: PlannedJob[]): number {
	let retained = 0;
	for (const entry of planned) {
		if (isOwnerCatchUp(entry)) retained += 1;
	}
	return retained;
}

function isOwnerCatchUp({ job, plan }: PlannedJob): boolean {
	return (
		job.ownerKey !== null &&
		job.misfirePolicy === ScheduledJobMisfirePolicy.CoalesceOwner &&
		plan.catchUpAt !== null
	);
}

function groupOwnerCatchUps(planned: PlannedJob[]): Map<string, GroupMember[]> {
	const groups = new Map<string, GroupMember[]>();

	for (const entry of planned) {
		if (!isOwnerCatchUp(entry)) continue;
		const { catchUpAt } = entry.plan;
		if (catchUpAt === null) continue;

		const key = groupKey(entry.job);
		if (key === null) continue;

		const member: GroupMember = { entry, catchUpAt: catchUpAt.getTime() };
		const members = groups.get(key);
		if (members === undefined) groups.set(key, [member]);
		else members.push(member);
	}

	return groups;
}

function groupKey(job: ScheduledJob): string | null {
	try {
		return JSON.stringify([
			job.ownerKey,
			job.taskType,
			job.misfireGraceSeconds,
			stableShape(job.payload),
		]);
	} catch {
		return null;
	}
}

function stableShape(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableShape);
	if (typeof value === 'object' && value !== null) {
		const entries = Object.entries(value as Record<string, unknown>);
		entries.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
		return entries.map(([key, entry]) => [key, stableShape(entry)]);
	}
	return value;
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
