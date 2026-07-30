import { Time } from '@n8n/constants';

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

/**
 * @returns for a due job at time `now`, which occurrences to record and where its clock lands next.
 */
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
		return { occurrences: [], nextRunAt: null, lastFiredAt: job.lastFiredAt };
	}

	const occurrences: Date[] = [];
	const fires = occurrencesFrom(schedule, job.nextRunAt);
	let fire = fires.next();
	while (
		!fire.done &&
		fire.value.getTime() <= windowEnd &&
		occurrences.length < options.maxPerJob
	) {
		occurrences.push(fire.value);
		fire = fires.next();
	}

	return {
		occurrences,
		nextRunAt: fire.done ? null : fire.value,
		lastFiredAt: occurrences.at(-1) ?? job.lastFiredAt,
	};
}
