/* eslint-disable @typescript-eslint/naming-convention */
/**
 * The durable scheduler's shared vocabulary: schedule definitions, recurrence
 * kinds, misfire handling and the task lifecycle.
 *
 * Defined in a leaf package so every consumer shares one definition without a
 * package cycle: `@n8n/scheduler` (the domain and algorithms), `@n8n/db` (the
 * schema: column defaults, CHECK constraints) and `@n8n/decorators` (the
 * system task contract).
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
 * When a job runs, minus its identity and clock: the schedule half of a scheduled job.
 * Comparing two of these (plus clock liveness) is what tells a caller whether a job's schedule changed.
 */
export type ScheduleDefinition =
	| CronDefinition
	| RecurringCronDefinition
	| IntervalDefinition
	| OneOffDefinition;

/** A cron expression evaluated in a timezone (`null` means the instance default). */
export interface CronDefinition {
	kind: typeof ScheduledJobKind.Cron;
	cronExpression: string;
	timezone: string | null;
}

/** A cron expression gated to fire only every Nth period. */
export interface RecurringCronDefinition {
	kind: typeof ScheduledJobKind.RecurringCron;
	cronExpression: string;
	timezone: string | null;
	recurrenceUnit: RecurringCronUnit;
	recurrenceSize: number;
}

/** A fixed elapsed-time cadence; no timezone by design. */
export interface IntervalDefinition {
	kind: typeof ScheduledJobKind.Interval;
	intervalSeconds: number;
}

/** A single fire at a fixed instant, then never again. */
export interface OneOffDefinition {
	kind: typeof ScheduledJobKind.OneOff;
	fireAt: Date;
}

/**
 * What happens to occurrences that missed their grace window:
 * - `coalesce`: run the latest one, drop the rest
 * - `coalesce_owner`: same as `coalesce`, but per owner. Only the job with
 *   the latest missed occurrence runs late. The other jobs sharing that
 *   owner drop theirs.
 * - `skip`: drop them all, resume from the next occurrence
 *
 * In every case the clock moves past the backlog, so nothing replays.
 *
 * One-off schedules have no next occurrence to fall back on:
 * - `coalesce` still runs it, late
 * - `skip` drops it for good
 * - `coalesce_owner` runs it late only if it wins its owner group; losing
 *   means it never runs at all
 */
export const ScheduledJobMisfirePolicy = {
	Coalesce: 'coalesce',
	CoalesceOwner: 'coalesce_owner',
	Skip: 'skip',
} as const;

export type ScheduledJobMisfirePolicy =
	(typeof ScheduledJobMisfirePolicy)[keyof typeof ScheduledJobMisfirePolicy];

/**
 * How late an occurrence may be before its schedule's misfire policy applies,
 * for a job provisioned without an explicit grace.
 *
 * Consumers that must freeze a historical default pin their own copy of this
 * value: changing this constant only affects jobs provisioned from now on.
 */
export const DEFAULT_MISFIRE_GRACE_SECONDS = 60;

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

/** Statuses of finished work: the only tasks retention may delete. */
export const TerminalTaskStatusList = [
	ScheduledTaskStatus.Succeeded,
	ScheduledTaskStatus.Failed,
	ScheduledTaskStatus.Missed,
	ScheduledTaskStatus.Cancelled,
] as const;

export type TerminalTaskStatus = (typeof TerminalTaskStatusList)[number];

/**
 * Well-known owners of scheduled jobs. Every job names its owner
 * (`ownerType` + `ownerId`), so the scheduler can tear a job down without
 * knowing what the owner is.
 *
 * Deliberately not an exhaustive union: `ownerType` is a plain string, so a
 * new part of the product can own jobs without an edit here. These are the
 * ones that exist today.
 */
export const ScheduledJobOwnerType = {
	/** A published workflow; `ownerId` is its id, `ownerMemberId` the trigger node's. */
	Workflow: 'workflow',
	/** An instance-level maintenance job, self-owned: `ownerId` is the job's own name. */
	SystemTask: 'system-task',
} as const;

/** Longest accepted `ownerType`. */
export const SCHEDULED_JOB_OWNER_TYPE_MAX_LENGTH = 32;

/** Longest accepted `ownerId`. */
export const SCHEDULED_JOB_OWNER_ID_MAX_LENGTH = 255;

/** Longest accepted `ownerMemberId`. */
export const SCHEDULED_JOB_OWNER_MEMBER_ID_MAX_LENGTH = 36;
