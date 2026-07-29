import { ScheduledJobMisfirePolicy, Time } from '@n8n/constants';

import { CorruptStorageRowError } from '../errors';
import { occurrencesFrom } from '../recurrence/next-run';
import { resolveSchedule } from '../recurrence/resolve';
import type { ScheduledJob } from '../types';

/**
 * What a due job expands into for one materialization pass.
 */
export interface OccurrencePlan {
	/** The instants to record, oldest first; each becomes one task, unique per (job, instant). */
	occurrences: Date[];

	/**
	 * How many due instants the misfire policy discarded. The clock still advances
	 * past them (see {@link nextRunAt}), so they are gone, not deferred.
	 */
	skippedOccurrences: number;

	/**
	 * The one occurrence a `coalesce` policy kept to stand in for a backlog, always the
	 * first of {@link occurrences}. `null` when no policy applied.
	 */
	catchUpAt: Date | null;

	/**
	 * The next instant not yet recorded,
	 * or `null` once the schedule has no more fires.
	 */
	nextRunAt: Date | null;

	/**
	 * The last instant recorded,
	 * or the job's previous value when nothing was recorded.
	 */
	lastFiredAt: Date | null;
}

export function planOccurrences(
	job: ScheduledJob,
	now: Date,
	options: { windowSeconds: number; maxPerJob: number; defaultTimezone: string },
): OccurrencePlan {
	// Resolved here, not at claim time, so a corrupt row throws inside the
	// materializer's per-job isolation and defers only this job.
	const schedule = resolveSchedule(job, options.defaultTimezone);
	const windowEnd = now.getTime() + options.windowSeconds * Time.seconds.toMilliseconds;

	if (job.nextRunAt === null) {
		return {
			occurrences: [],
			skippedOccurrences: 0,
			catchUpAt: null,
			nextRunAt: null,
			lastFiredAt: job.lastFiredAt,
		};
	}

	const due: Date[] = [];
	const fires = occurrencesFrom(schedule, job.nextRunAt);
	let fire = fires.next();
	while (!fire.done && fire.value.getTime() <= windowEnd && due.length < options.maxPerJob) {
		due.push(fire.value);
		fire = fires.next();
	}
	// The cap, not the window, ended the walk: instants remain that this pass will not
	// record.
	const truncated = !fire.done && fire.value.getTime() <= windowEnd;

	const { occurrences, catchUpAt } = applyMisfirePolicy(due, now, job, truncated);

	return {
		occurrences,
		skippedOccurrences: due.length - occurrences.length,
		catchUpAt,
		nextRunAt: fire.done ? null : fire.value,
		// Tracks every instant this pass consumed, not only the recorded ones: a
		// discarded occurrence is still one the schedule has moved past.
		lastFiredAt: due.at(-1) ?? job.lastFiredAt,
	};
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
 */
function applyMisfirePolicy(
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
