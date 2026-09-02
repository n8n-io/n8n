import { ScheduledJobMisfirePolicy, Time } from '@n8n/constants';

import { CorruptStorageRowError } from '../errors';
import type { ScheduledJob } from '../types';
import type { PlannedJob } from './transaction';

/** Occurrences one task type's jobs discarded under one misfire policy. */
export interface MisfireCount {
	taskType: string;
	policy: ScheduledJobMisfirePolicy;
	discarded: number;
}

/**
 * Drops the due instants a schedule's misfire policy says should no longer run.
 *
 * Nothing is dropped until an instant is past `scheduledFor + misfireGraceSeconds`.
 * Once one is, the whole backlog goes, not only the past-deadline part of it, or the
 * rest would fire back to back behind the catch-up run.
 *
 * `truncated` says the cap ended the walk, so the newest instant here is not the
 * newest missed one; the catch-up run is deferred rather than recorded.
 *
 * Only ever sees instants the current pass is about to record for the first time.
 * An instant already recorded by an earlier pass, that then goes unclaimed past its
 * own deadline, doesn't come back through here: it's retired directly (see
 * `ScheduledTaskRepository.retireMissedPending`), regardless of policy.
 */
export function applyMisfirePolicy(
	due: Date[],
	now: Date,
	job: ScheduledJob,
	truncated: boolean,
): { occurrences: Date[]; catchUpAt: Date | null } {
	const graceDeadline = now.getTime() - job.misfireGraceSeconds * Time.seconds.toMilliseconds;
	// Sorted ascending, so the oldest instant is the furthest past its deadline.
	const behind = due.filter((occurrence) => occurrence.getTime() <= now.getTime());
	const ahead = due.slice(behind.length);
	if (behind.length === 0 || behind[0].getTime() > graceDeadline) {
		return { occurrences: due, catchUpAt: null };
	}

	switch (job.misfirePolicy) {
		case ScheduledJobMisfirePolicy.Coalesce: {
			if (truncated && ahead.length === 0) return { occurrences: [], catchUpAt: null };
			const catchUpAt = behind[behind.length - 1];
			return { occurrences: [catchUpAt, ...ahead], catchUpAt };
		}
		case ScheduledJobMisfirePolicy.Skip:
			return { occurrences: ahead, catchUpAt: null };
		default: {
			// A policy this version does not know, e.g. a row written by a newer instance
			// and read back after a rollback.
			const exhaustive: never = job.misfirePolicy;
			throw new CorruptStorageRowError(
				`scheduled_job ${job.id} has unknown misfire policy '${String(exhaustive)}'`,
			);
		}
	}
}

/** Groups a pass's discarded occurrences by the task type and policy that discarded them. */
export function countMisfires(planned: PlannedJob[]): MisfireCount[] {
	const grouped = planned
		.filter(({ plan }) => plan.skippedOccurrences > 0)
		.reduce((groups, { job, plan }) => {
			const key = `${job.taskType}:${job.misfirePolicy}`;
			return groups.set(key, {
				taskType: job.taskType,
				policy: job.misfirePolicy,
				discarded: (groups.get(key)?.discarded ?? 0) + plan.skippedOccurrences,
			});
		}, new Map<string, MisfireCount>());
	return [...grouped.values()];
}
