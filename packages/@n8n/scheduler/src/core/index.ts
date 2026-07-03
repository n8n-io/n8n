/**
 * `@n8n/scheduler`: durable, multi-main work scheduler.
 *
 * The core concern is *coordination*: each unit of scheduled work (a
 * `ScheduledTask`) is claimed and run exactly once on one main, with leases and
 * fencing for crash recovery. That layer is time-agnostic; it only asks whether a
 * task is due now. The claim / lease / fencing / reaper code lands in later
 * tickets.
 *
 * *Recurrence* is one source of work, not the core: a `ScheduledJob` with a cron
 * / interval / one-off `Schedule` is materialised into tasks. All time and DST
 * math is confined to this boundary (see `recurrence/`).
 */

// These enums live in `@n8n/db` (the schema is their source of truth), re-exported
// here so consumers use them through the scheduler's own API.
export {
	ScheduledJobKind,
	ScheduledJobKindList,
	ScheduledTaskStatus,
	ScheduledTaskStatusList,
} from './enums';

export type {
	CronSchedule,
	IntervalSchedule,
	OneOffSchedule,
	Schedule,
	ScheduledJob,
	ScheduledTask,
} from './types';

export { InvalidScheduleError, CorruptStorageRowError } from './errors';

export { computeNextRunAt } from './recurrence/next-run';
export { validateSchedule } from './recurrence/validate';
