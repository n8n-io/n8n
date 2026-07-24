import { CronExpressionParser } from 'cron-parser';
import { IANAZone } from 'luxon';
import type { CronExpression } from 'n8n-workflow';

import { InvalidScheduleError } from '../../errors';
import type { CronSchedule, RecurringCronSchedule, ScheduledJob } from '../../types';
import { required } from '../field';

/** A cron expression must have 6 fields (the first is seconds). */
const CRON_FIELD_COUNT = 6;

export type CronCursor = ReturnType<typeof CronExpressionParser.parse>;

/**
 * Checks that a cron schedule is usable: a 6-field expression in a real
 * timezone. Also used for `recurring_cron`, which reuses the cron expression.
 * @param schedule The cron (or recurring_cron) schedule to check.
 * @throws {InvalidScheduleError} When the expression or timezone is invalid.
 */
export function validateCron(schedule: CronSchedule | RecurringCronSchedule): void {
	// Raw DB rows may reach here untyped, so check the runtime type before use.
	const expression: unknown = schedule.cronExpression;
	if (typeof expression !== 'string') {
		throw new InvalidScheduleError(
			`${schedule.kind}.cronExpression must be a string, got ${JSON.stringify(expression)}`,
		);
	}

	const fieldCount = expression.trim().split(/\s+/).length;
	if (fieldCount !== CRON_FIELD_COUNT) {
		throw new InvalidScheduleError(
			`Cron expression must have ${CRON_FIELD_COUNT} fields (seconds included), got ${fieldCount}: ${JSON.stringify(expression)}`,
		);
	}

	// A null timezone is the instance default, resolved by the caller.
	if (schedule.timezone !== null && !IANAZone.isValidZone(schedule.timezone)) {
		throw new InvalidScheduleError(`Unknown IANA timezone: ${JSON.stringify(schedule.timezone)}`);
	}

	try {
		CronExpressionParser.parse(expression, { tz: schedule.timezone ?? 'UTC' });
	} catch (error) {
		throw new InvalidScheduleError(
			`Invalid cron expression ${JSON.stringify(expression)}: ${(error as Error).message}`,
		);
	}
}

/**
 * The schedule's timezone as a concrete IANA zone.
 * @param schedule The cron (or recurring_cron) schedule.
 * @returns The resolved timezone.
 * @throws {InvalidScheduleError} When the timezone is still `null` (the instance
 * default should have been resolved upstream).
 */
export function resolvedTimezone(schedule: CronSchedule | RecurringCronSchedule): string {
	if (schedule.timezone === null) {
		throw new InvalidScheduleError(
			'Cron timezone must be resolved to a concrete zone before computing the next run, got null',
		);
	}
	return schedule.timezone;
}

/**
 * A cursor over the cron fires strictly after `after`, in the given IANA
 * timezone. `cron-parser` resolves DST via luxon (wall-clock): a nonexistent
 * local time (spring-forward) shifts forward, a repeated one (fall-back) fires
 * once.
 * @param cronExpression The cron expression to evaluate.
 * @param after The instant the cursor starts firing after (strictly).
 * @param timezone IANA zone the expression is evaluated in.
 * @returns A cursor whose `next()` yields successive fires.
 * @throws {InvalidScheduleError} When the expression cannot be parsed.
 */
export function parseCron(
	cronExpression: CronExpression,
	after: Date,
	timezone: string,
): CronCursor {
	try {
		return CronExpressionParser.parse(cronExpression, { currentDate: after, tz: timezone });
	} catch (error) {
		throw new InvalidScheduleError(
			`Failed to evaluate cron expression ${JSON.stringify(cronExpression)} in timezone ${JSON.stringify(timezone)}: ${(error as Error).message}`,
		);
	}
}

/**
 * The next cron fire strictly after `after`.
 * @param schedule The cron schedule. A `recurring_cron` works too: its first
 * fire ignores the "every N" rule (there is no previous fire to count from yet).
 * @param after The instant to fire after.
 * @returns The matching instant; cron is unbounded, so this is never `null`.
 */
export function cronNextRun(schedule: CronSchedule | RecurringCronSchedule, after: Date): Date {
	return parseCron(schedule.cronExpression, after, resolvedTimezone(schedule)).next().toDate();
}

/**
 * Every cron fire starting at `first`, oldest first.
 * @param first The first fire to yield.
 * @returns An endless generator of fire times.
 */
export function* cronOccurrences(schedule: CronSchedule, first: Date): Generator<Date> {
	const cursor = parseCron(schedule.cronExpression, first, resolvedTimezone(schedule));
	yield first;
	for (;;) {
		yield cursor.next().toDate();
	}
}

/**
 * Builds a cron schedule from a job.
 * @param job The job to build from.
 * @param defaultTimezone Instance default used when the job has no timezone.
 * @returns The cron schedule.
 * @throws {CorruptStorageRowError} When the cron expression field is unset.
 */
export function resolveCron(job: ScheduledJob, defaultTimezone: string): CronSchedule {
	return {
		kind: 'cron',
		// `cronExpression` is a plain string on the job, validated on write; narrow it here.
		cronExpression: required(job, 'cronExpression') as CronExpression,
		timezone: job.timezone ?? defaultTimezone,
	};
}
