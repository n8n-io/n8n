import type { ScheduledJobKind, RecurringCronUnit } from '@n8n/constants';
import type { CronExpression } from 'n8n-workflow';

/**
 * The recurrence source: a `ScheduledJob` defines recurring work through a cron /
 * interval / one-off rule, which the materialiser turns into tasks. Time
 * and DST math over these types lives in `recurrence/`; coordination (the core)
 * never looks at them.
 *
 * `CronExpression` is imported from `n8n-workflow` (its canonical home) and not
 * re-exported here.
 */

/**
 * A 6-field cron expression (seconds included) evaluated in an IANA timezone.
 * Wall-clock: fires at the given local time, so DST shifts the absolute instant.
 * `timezone === null` means the instance default, resolved by the caller before
 * the math runs.
 */
export interface CronSchedule {
	kind: 'cron';
	cronExpression: CronExpression;
	timezone: string | null;
}

/**
 * A fixed-period schedule firing every `intervalSeconds`, measured as absolute
 * elapsed time (UTC) from the prior occurrence, so DST never shifts a fire. No
 * timezone field by design.
 */
export interface IntervalSchedule {
	kind: 'interval';
	intervalSeconds: number;
}

/** Fires exactly once at `fireAt`, then never again. A fixed instant: no tz/DST concern. */
export interface OneOffSchedule {
	kind: 'one_off';
	fireAt: Date;
}

/**
 * A cron expression paired with an "every N periods" filter, for schedules a
 * cron expression cannot express on its own ("every 3 weeks on Mon and Wed",
 * "every 5 hours"). The cron expression proposes candidate run times; the
 * filter keeps a candidate only when it falls in the same period as the
 * previous fire (so "Mon and Wed" fires both days of a kept week) or at least
 * `recurrenceSize` periods have elapsed since that fire.
 *
 * Because the filter counts from the previous fire, the next fire depends on
 * it: the `after` argument to the recurrence math must be the previous fire,
 * not an arbitrary instant.
 */
export interface RecurringCronSchedule {
	kind: 'recurring_cron';
	cronExpression: CronExpression;
	timezone: string | null;
	recurrenceUnit: RecurringCronUnit;
	/** The N in "every N periods"; at least 2 (N = 1 keeps every fire, which is a plain cron). */
	recurrenceSize: number;
}

export type Schedule = CronSchedule | IntervalSchedule | OneOffSchedule | RecurringCronSchedule;

export interface ScheduledJob {
	id: number;
	taskType: string;
	payload: Record<string, unknown>;
	kind: ScheduledJobKind;
	/** Set only when {@link kind} is `cron` or `recurring_cron`. */
	cronExpression: string | null;
	/** IANA zone a cron expression is evaluated in; `null` means the instance default. */
	timezone: string | null;
	/** Set only when {@link kind} is `interval`. */
	intervalSeconds: number | null;
	/** Set only when {@link kind} is `one_off`. */
	fireAt: Date | null;
	/** Set only when {@link kind} is `recurring_cron`. */
	recurrenceUnit: RecurringCronUnit | null;
	/** Set only when {@link kind} is `recurring_cron`. */
	recurrenceSize: number | null;
	nextRunAt: Date | null; // the next instant the materializer materializes from.
	lastFiredAt: Date | null;
	maxAttempts: number;
}
