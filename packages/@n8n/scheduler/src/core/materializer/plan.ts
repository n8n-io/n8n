import { Time } from '@n8n/constants';

import { applyMisfirePolicy } from './misfire';
import { occurrencesFrom } from '../recurrence/next-run';
import { resolveSchedule } from '../recurrence/resolve';
import type { ScheduledJob } from '../types';

/**
 * What a due job expands into for one materialization pass.
 */
export interface OccurrencePlan {
	/**
	 * The instants to record, oldest first.
	 * Each becomes one task, unique per (job, instant).
	 */
	occurrences: Date[];

	/**
	 * How many due instants the misfire policy discarded rather than record.
	 * The job's clock still advanced past them (see {@link nextRunAt}), so they
	 * are gone, not deferred.
	 */
	skippedOccurrences: number;

	/**
	 * The one occurrence a `coalesce` policy kept to stand in for a backlog, always the
	 * first of {@link occurrences}. `null` when no policy applied, or a sibling in
	 * its owner group won instead.
	 */
	catchUpAt: Date | null;

	/**
	 * The instant before which this job's already-recorded pending occurrences
	 * should be retired.
	 */
	retireBefore: Date | null;

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
			retireBefore: null,
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
		retireBefore: catchUpAt,
		nextRunAt: fire.done ? null : fire.value,
		// Tracks every instant this pass consumed, not only the recorded ones: a
		// discarded occurrence is still one the schedule has moved past.
		lastFiredAt: due.at(-1) ?? job.lastFiredAt,
	};
}
