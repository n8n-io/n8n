/* eslint-disable @typescript-eslint/naming-convention */
/**
 * The durable scheduler's shared vocabulary: recurrence kinds and the task
 * lifecycle. Defined here — a leaf package both sides already depend on — so
 * `@n8n/scheduler` (the domain and algorithms) and `@n8n/db` (the schema:
 * column defaults, CHECK constraints) share one definition without a package
 * cycle.
 */

/**
 * How a scheduled job decides when to fire:
 * - on a cron expression
 * - on a fixed interval
 * - just once
 * - or on a cron repeated every N periods.
 */
export const ScheduledJobKind = {
	Cron: 'cron',
	Interval: 'interval',
	OneOff: 'one_off',
	RecurringCron: 'recurring_cron',
} as const;

export type ScheduledJobKind = (typeof ScheduledJobKind)[keyof typeof ScheduledJobKind];

/** All recurrence kinds as a runtime list. */
export const ScheduledJobKindList = Object.values(ScheduledJobKind);

/**
 * The unit of recurrence for a `recurring_cron` schedule: a cron expression
 * repeated every N of these. For example:
 * - `weeks` for "every 3 weeks"
 * - `hours` for "every 5 hours"
 *
 * Only these coarse units are supported here.
 * Finer cadences (every N seconds or minutes) are expressed as a different schedule instead
 * (a plain `interval`, or a stepped cron expression, see {@link ScheduledJobKind}),
 * so they never go through this recurrence step.
 */
export const RecurringCronUnit = {
	Hours: 'hours',
	Days: 'days',
	Weeks: 'weeks',
	Months: 'months',
} as const;

export type RecurringCronUnit = (typeof RecurringCronUnit)[keyof typeof RecurringCronUnit];

export const RecurringCronUnitList = Object.values(RecurringCronUnit);

/**
 * Where a scheduled task is in its lifecycle, from waiting to run to a final outcome.
 */
export const ScheduledTaskStatus = {
	Pending: 'pending',
	Running: 'running',
	Succeeded: 'succeeded',
	Failed: 'failed',
	Missed: 'missed',
	Cancelled: 'cancelled',
} as const;

export type ScheduledTaskStatus = (typeof ScheduledTaskStatus)[keyof typeof ScheduledTaskStatus];

/** All statuses as a runtime list. */
export const ScheduledTaskStatusList = Object.values(ScheduledTaskStatus);

/** Statuses of finished work: the only rows retention may delete. */
export const TerminalTaskStatusList = [
	ScheduledTaskStatus.Succeeded,
	ScheduledTaskStatus.Failed,
	ScheduledTaskStatus.Missed,
	ScheduledTaskStatus.Cancelled,
] as const;

export type TerminalTaskStatus = (typeof TerminalTaskStatusList)[number];
