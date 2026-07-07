import { Time } from '@n8n/constants';
import { CronExpressionParser } from 'cron-parser';

import { InvalidScheduleError } from '../errors';
import type { CronSchedule, IntervalSchedule, OneOffSchedule, Schedule } from '../types';
import { validateSchedule } from './validate';

/**
 * Cron: next fire strictly after `after`, in the schedule's IANA timezone.
 * `cron-parser` advances from `currentDate` with strictly-after semantics and
 * resolves DST via luxon. The timezone must already be resolved to a concrete
 * zone (a `null` instance default is rejected upstream). Wall-clock: a
 * nonexistent local time (spring-forward) shifts forward; a repeated local time
 * (fall-back) fires once.
 */
function cronNextRun(schedule: CronSchedule, after: Date, timezone: string): Date {
	try {
		const it = CronExpressionParser.parse(schedule.cronExpression, {
			currentDate: after,
			tz: timezone,
		});
		return it.next().toDate();
	} catch (error) {
		throw new InvalidScheduleError(
			`Failed to evaluate cron expression ${JSON.stringify(schedule.cronExpression)} in timezone ${JSON.stringify(timezone)}: ${(error as Error).message}`,
		);
	}
}

/**
 * Interval: advances by `intervalSeconds` of real elapsed time (UTC) from
 * `after` (the prior occurrence), so the cadence is deterministic and DST never
 * shifts a fire. Always strictly after `after` (intervalSeconds is positive).
 */
function intervalNextRun(schedule: IntervalSchedule, after: Date): Date {
	return new Date(after.getTime() + schedule.intervalSeconds * Time.seconds.toMilliseconds);
}

/** One-off: `fireAt` when it is strictly after `after`, otherwise `null` (exhausted). */
function oneOffNextRun(schedule: OneOffSchedule, after: Date): Date | null {
	return after.getTime() < schedule.fireAt.getTime() ? schedule.fireAt : null;
}

/**
 * Compute the next occurrence strictly after `after` (a job's current
 * `nextRunAt` / last scheduled instant), as a UTC instant. This is what the
 * materializer advances `next_run_at` with.
 *
 * The schedule is validated first, so malformed input (non-positive interval,
 * invalid `fireAt`, bad cron expression, unresolved `null` cron timezone) throws
 * {@link InvalidScheduleError} rather than returning a wrong or `Invalid` instant.
 *
 * Returns `null` only when the schedule is exhausted (a one-off already at or
 * past `after`); cron and interval schedules are unbounded.
 */
export function computeNextRunAt(schedule: Schedule, after: Date): Date | null {
	validateSchedule(schedule);

	switch (schedule.kind) {
		case 'cron':
			if (schedule.timezone === null) {
				throw new InvalidScheduleError(
					'Cron timezone must be resolved to a concrete zone before computing the next run, got null',
				);
			}
			return cronNextRun(schedule, after, schedule.timezone);
		case 'interval':
			return intervalNextRun(schedule, after);
		case 'one_off':
			return oneOffNextRun(schedule, after);
		default: {
			const exhaustive: never = schedule;
			throw new InvalidScheduleError(
				`Unknown schedule kind: ${JSON.stringify((exhaustive as Schedule).kind)}`,
			);
		}
	}
}
