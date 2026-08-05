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
			// Exempt only when its own miss predates the winner's: a schedule with no
			// next run has nothing left to retry, but an equal `catchUpAt` means the
			// winner's occurrence already covers this exact instant, so dropping it
			// here loses nothing.
			if (member.entry.plan.nextRunAt === null && member.catchUpAt < winner.catchUpAt) continue;
			losers.add(member.entry);
		}
	}

	if (losers.size === 0) return planned;
	return planned.map((entry) => (losers.has(entry) ? dropCatchUp(entry) : entry));
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

/**
 * Owner, task type, payload and grace: the surviving occurrence carries the
 * winner's values for all of them, so members must agree on each one.
 * `maxAttempts` is deliberately excluded: provisioning only sets it on insert,
 * so a later-raised limit would otherwise leave a node's rules permanently
 * unable to coalesce.
 */
function groupKey(job: ScheduledJob): string | null {
	try {
		return JSON.stringify([job.ownerKey, job.taskType, job.misfireGraceSeconds, job.payload]);
	} catch {
		// An unserializable payload opts this job out of grouping rather than
		// failing the whole pass.
		return null;
	}
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
