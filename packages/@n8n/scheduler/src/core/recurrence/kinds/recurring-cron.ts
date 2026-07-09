import { RecurringCronUnitList } from '@n8n/constants';
import type { CronExpression } from 'n8n-workflow';

import { InvalidScheduleError } from '../../errors';
import type { RecurringCronSchedule, ScheduledJob } from '../../types';
import { required } from '../field';
import { periodsBetween } from '../periods';
import { type CronCursor, cronNextRun, parseCron, resolvedTimezone, validateCron } from './cron';

/**
 * How many cron fires an "every N periods" scan may reject before giving up.
 * Real schedules stay far below this (a weekly cron kept every N weeks rejects
 * at most 7×N candidates); hitting the bound means the cron fires so much more
 * often than the rule keeps that the schedule is judged malformed.
 */
const MAX_RECURRENCE_CANDIDATES = 10_000;

/**
 * Checks an "every N periods" cron schedule: a valid cron expression, a known
 * period unit, and N of at least 2 (N = 1 keeps every fire, which is a plain
 * cron).
 * @param schedule The recurring_cron schedule to check.
 * @throws {InvalidScheduleError} When the cron, unit, or N is invalid.
 */
export function validateRecurringCron(schedule: RecurringCronSchedule): void {
	validateCron(schedule);

	if (!RecurringCronUnitList.includes(schedule.recurrenceUnit)) {
		throw new InvalidScheduleError(
			`recurring_cron.recurrenceUnit must be one of ${RecurringCronUnitList.join(', ')}, got ${JSON.stringify(schedule.recurrenceUnit)}`,
		);
	}

	if (!Number.isInteger(schedule.recurrenceSize) || schedule.recurrenceSize < 2) {
		throw new InvalidScheduleError(
			`recurring_cron.recurrenceSize must be an integer of at least 2 (a stride of 1 is a plain cron), got ${JSON.stringify(schedule.recurrenceSize)}`,
		);
	}
}

/**
 * Whether a candidate fire time should actually fire, for an "every N periods"
 * schedule. It only compares the candidate to the previous fire — there is no
 * hidden counter — so it gives the same answer on any machine and after a
 * restart.
 *
 * The candidate fires when either:
 * - it falls in the same period as the previous fire, so a rule like "every 2
 *   weeks on Monday and Wednesday" fires both days of a chosen week; or
 * - at least N periods have passed since the previous fire. "At least" (rather
 *   than "exactly") means that after downtime it resumes at the next fire
 *   instead of skipping a whole cycle.
 *
 * @param previousFire The last time the schedule fired.
 * @param candidate The fire time being considered.
 * @param schedule The cron schedule plus its "every N periods" rule.
 * @param timezone IANA zone the periods are counted in.
 * @returns Whether the candidate should fire.
 */
export function isOnCadence(
	previousFire: Date,
	candidate: Date,
	schedule: RecurringCronSchedule,
	timezone: string,
): boolean {
	const elapsed = periodsBetween(previousFire, candidate, schedule.recurrenceUnit, timezone);
	return elapsed === 0 || elapsed >= schedule.recurrenceSize;
}

/**
 * The next cron fire the "every N periods" rule keeps, scanning `cursor` forward.
 * @param cursor The cron cursor, advanced past each candidate it rejects.
 * @param schedule The cron expression plus its "every N periods" rule.
 * @param previousFire The fire the rule counts periods from; candidates too
 * close to it are skipped.
 * @param timezone IANA zone the period count runs in.
 * @returns The next kept fire.
 * @throws {InvalidScheduleError} When no fire lands on the cadence within the
 * scan cap (a pathological schedule), instead of looping unbounded.
 */
function advanceToOnCadence(
	cursor: CronCursor,
	schedule: RecurringCronSchedule,
	previousFire: Date,
	timezone: string,
): Date {
	for (let scanned = 0; scanned < MAX_RECURRENCE_CANDIDATES; scanned++) {
		const candidate = cursor.next().toDate();
		if (isOnCadence(previousFire, candidate, schedule, timezone)) {
			return candidate;
		}
	}

	throw new InvalidScheduleError(
		`No fire of cron expression ${JSON.stringify(schedule.cronExpression)} lands on the every-${schedule.recurrenceSize}-${schedule.recurrenceUnit} cadence within ${MAX_RECURRENCE_CANDIDATES} candidates`,
	);
}

/**
 * The next fire of an "every N periods" cron schedule, strictly after `after`.
 *
 * The cron expression proposes candidate times; this returns the first one far
 * enough from the previous fire: either within the same period (so a rule like
 * "Monday and Wednesday" still fires both) or at least N periods later.
 *
 * @param schedule The cron expression plus its "every N periods" rule.
 * @param after The previous fire; the period count is measured from here.
 * @returns The next fire time.
 */
export function recurringCronNextRun(schedule: RecurringCronSchedule, after: Date): Date {
	const timezone = resolvedTimezone(schedule);
	const cursor = parseCron(schedule.cronExpression, after, timezone);
	return advanceToOnCadence(cursor, schedule, after, timezone);
}

/**
 * The first fire of a fresh "every N periods" cron schedule after `from`.
 * The "every N" rule is ignored here: there is no previous fire to count from
 * yet, so applying it would delay the first fire by up to N periods.
 * @param schedule The recurring_cron schedule.
 * @param from The instant the job was registered.
 * @returns The first fire time.
 */
export function recurringCronFirstRun(schedule: RecurringCronSchedule, from: Date): Date {
	return cronNextRun(schedule, from);
}

/**
 * Every kept fire of an "every N periods" cron schedule starting at `first`,
 * oldest first.
 * @param first The first fire to yield. Must be a real fire (each step counts
 * periods from the one before it), so seed it via {@link recurringCronNextRun}.
 * @returns An endless generator of fire times.
 */
export function* recurringCronOccurrences(
	schedule: RecurringCronSchedule,
	first: Date,
): Generator<Date> {
	const timezone = resolvedTimezone(schedule);
	const cursor = parseCron(schedule.cronExpression, first, timezone);
	let previous = first;
	yield previous;
	for (;;) {
		previous = advanceToOnCadence(cursor, schedule, previous, timezone);
		yield previous;
	}
}

/**
 * Builds an "every N periods" cron schedule from a job.
 * @param job The job to build from.
 * @param defaultTimezone Instance default used when the job has no timezone.
 * @returns The recurring_cron schedule.
 * @throws {CorruptStorageRowError} When a required field is unset.
 */
export function resolveRecurringCron(
	job: ScheduledJob,
	defaultTimezone: string,
): RecurringCronSchedule {
	return {
		kind: 'recurring_cron',
		cronExpression: required(job, 'cronExpression') as CronExpression,
		timezone: job.timezone ?? defaultTimezone,
		recurrenceUnit: required(job, 'recurrenceUnit'),
		recurrenceSize: required(job, 'recurrenceSize'),
	};
}
