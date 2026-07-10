import { InvalidScheduleError } from '../errors';
import type { Schedule } from '../types';
import { cronNextRun, cronOccurrences } from './kinds/cron';
import { intervalNextRun, intervalOccurrences } from './kinds/interval';
import { oneOffNextRun, oneOffOccurrences } from './kinds/one-off';
import {
	recurringCronFirstRun,
	recurringCronNextRun,
	recurringCronOccurrences,
} from './kinds/recurring-cron';
import { validateSchedule } from './validate';

/**
 * Computes the next occurrence of a schedule, strictly after `after`, as a UTC
 * instant. The materializer uses the result to advance `next_run_at`.
 *
 * How the next fire is found depends on the kind:
 * - `cron`: the next time the cron expression matches.
 * - `interval`: `after` plus the interval.
 * - `one_off`: the fire time, or `null` if it already passed (exhausted).
 * - `recurring_cron`: the next cron fire the every-N rule keeps.
 *
 * @param schedule The schedule to advance. Validated first, so bad input throws instead of returning a wrong instant.
 * @param after The job's last scheduled fire (its current `nextRunAt`). For
 * `recurring_cron` this must be the previous fire, since the rule counts periods
 * from it; seed a fresh job with {@link computeFirstRunAt}, not an arbitrary
 * instant.
 * @returns The next occurrence, or `null` when exhausted. Only `one_off` ever
 * returns `null`; the other kinds never run out.
 * @throws {InvalidScheduleError} On malformed input: a non-positive interval, an
 * invalid `fireAt`, or a broken cron expression.
 */
export function computeNextRunAt(schedule: Schedule, after: Date): Date | null {
	validateSchedule(schedule);

	switch (schedule.kind) {
		case 'cron':
			return cronNextRun(schedule, after);
		case 'recurring_cron':
			return recurringCronNextRun(schedule, after);
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

/**
 * Computes a fresh job's first occurrence after `from` (its registration
 * instant). The one seeding API for `next_run_at`. Every kind but
 * `recurring_cron` has no history and matches {@link computeNextRunAt}; a
 * `recurring_cron` fires at its next cron instant with the every-N rule ignored.
 * @param schedule The schedule to seed.
 * @param from The registration instant.
 * @returns The first occurrence, or `null` for an already-passed one-off.
 * @throws {InvalidScheduleError} On malformed input.
 */
export function computeFirstRunAt(schedule: Schedule, from: Date): Date | null {
	if (schedule.kind === 'recurring_cron') {
		validateSchedule(schedule);
		return recurringCronFirstRun(schedule, from);
	}
	return computeNextRunAt(schedule, from);
}

/**
 * The successive occurrences of a schedule for one materialization walk, oldest
 * first, beginning with `first` (a job's current `next_run_at`: an already-due
 * fire) and continuing until the schedule is exhausted. Parses any cron
 * expression once and advances a single cursor, so walking a wide window costs
 * no repeated parsing — unlike calling {@link computeNextRunAt} in a loop.
 *
 * Like {@link computeNextRunAt}, `first` for a `recurring_cron` must be a real
 * fire, not an arbitrary lower bound: each step counts periods from the fire
 * before it, so the sequence is only correct when seeded from one (via
 * {@link computeFirstRunAt}).
 * @param schedule The schedule to walk.
 * @param first The first occurrence to yield.
 * @returns A generator of occurrences, oldest first.
 * @throws {InvalidScheduleError} On malformed input.
 */
export function* occurrencesFrom(schedule: Schedule, first: Date): Generator<Date> {
	validateSchedule(schedule);

	switch (schedule.kind) {
		case 'cron':
			yield* cronOccurrences(schedule, first);
			return;
		case 'recurring_cron':
			yield* recurringCronOccurrences(schedule, first);
			return;
		case 'interval':
			yield* intervalOccurrences(schedule, first);
			return;
		case 'one_off':
			yield* oneOffOccurrences(first);
			return;
		default: {
			const exhaustive: never = schedule;
			throw new InvalidScheduleError(
				`Unknown schedule kind: ${JSON.stringify((exhaustive as Schedule).kind)}`,
			);
		}
	}
}
