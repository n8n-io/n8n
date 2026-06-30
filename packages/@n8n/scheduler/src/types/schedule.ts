import type { CronExpression } from 'n8n-workflow';

/**
 * The recurrence source: a `ScheduledJob` defines recurring work through a cron /
 * interval / one-off `Schedule`, which the materialiser turns into tasks. Time
 * and DST math over these types lives in `recurrence/`; coordination (the core)
 * never looks at them.
 *
 * Field names mirror the `scheduled_job` columns so the storage adapter maps
 * trivially. Instants are `Date` (absolute UTC). `CronExpression` is imported
 * from `n8n-workflow` (its canonical home) and not re-exported here.
 */

/**
 * The recurrence kinds as a runtime list (not a bare union) so the schema column
 * and validation share one source of truth. Same idiom as `ExecutionStatusList`.
 */
export const ScheduleKindList = ['cron', 'interval', 'one_off'] as const;
export type ScheduleKind = (typeof ScheduleKindList)[number];

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

export type Schedule = CronSchedule | IntervalSchedule | OneOffSchedule;

/**
 * A schedule definition (`scheduled_job`). Recurrence lives in `schedule`;
 * `nextRunAt` is the next instant the sweep materialises from.
 */
export interface ScheduledJob {
	id: string;
	schedule: Schedule;
	enabled: boolean;
	nextRunAt: Date | null;
	lastFiredAt: Date | null;
}
