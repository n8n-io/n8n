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
 * / interval / one-off `Schedule` is materialized into tasks by the materializer
 * (see `materializer/`). All time and DST math is confined to this boundary
 * (see `recurrence/`).
 *
 * *Retention* (see `retention/`) bounds the task table: terminal tasks past
 * their window are deleted in bounded batches, so the queue's history cannot
 * grow without bound.
 */

// These enums live in `@n8n/db` (the schema is their source of truth), re-exported
// here so consumers use them through the scheduler's own API.
export {
	ScheduledJobKind,
	ScheduledJobKindList,
	ScheduledTaskStatus,
	ScheduledTaskStatusList,
	type TerminalTaskStatus,
	TerminalTaskStatusList,
} from './enums';

export type {
	CronSchedule,
	IntervalSchedule,
	OneOffSchedule,
	Schedule,
	ScheduledJob,
	ScheduledTask,
} from './types';

export {
	InvalidScheduleError,
	InvalidRetentionOptionsError,
	CorruptStorageRowError,
} from './errors';

export { computeNextRunAt } from './recurrence/next-run';
export { validateSchedule } from './recurrence/validate';

export { materialize, DEFAULT_MATERIALIZER_OPTIONS } from './materializer';
export type {
	MaterializerSummary,
	MaterializerOptions,
	OnJobPlanError,
} from './materializer';

export type {
	DueJobs,
	PlannedJob,
	RunInTransaction,
	MaterializerTransaction,
} from './materializer';

export { prune, DEFAULT_RETENTION_OPTIONS } from './retention';
export type {
	RetentionSummary,
	RetentionOptions,
	RetentionBatch,
	RetentionStore,
} from './retention';
