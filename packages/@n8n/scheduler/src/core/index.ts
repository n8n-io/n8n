/**
 * `@n8n/scheduler`: durable, multi-main work scheduler.
 *
 * The core concern is *coordination*: each unit of scheduled work (a
 * `ScheduledTask`) is claimed and run exactly once on one main, with leases and
 * fencing for crash recovery. That layer is time-agnostic; it only asks whether a
 * task is due now. The executor (see `executor/`) claims and fires due tasks;
 * the reaper (see `reaper/`) recovers tasks stranded by an expired lease.
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

export { createScheduler } from './scheduler';
export type {
	Scheduler,
	SchedulerDeps,
	SchedulerEvent,
	SchedulerEventLevel,
	SchedulerTaskStore,
} from './scheduler';

export {
	ScheduledJobKind,
	ScheduledJobKindList,
	ScheduledTaskStatus,
	ScheduledTaskStatusList,
	type TerminalTaskStatus,
	TerminalTaskStatusList,
} from './enums';

export type {
	ClaimedTask,
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
	DuplicateTaskHandlerError,
	CorruptStorageRowError,
} from './errors';

export { computeNextRunAt } from './recurrence/next-run';
export { resolveSchedule } from './recurrence/resolve';
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

export {
	Executor,
	DEFAULT_EXECUTOR_OPTIONS,
	TaskHandlerRegistry,
	PrecisionTimer,
	backoff,
} from './executor';
export type {
	ExecutorHooks,
	ExecutorOptions,
	ExecutorTaskStore,
	ClaimedTaskRef,
	ClaimDueTasksBatch,
	TaskHandler,
	TimerBackend,
	BackoffOptions,
} from './executor';

export { reap, DEFAULT_REAPER_OPTIONS } from './reaper';
export type {
	ReapResult,
	ReaperOptions,
	ReaperTaskStore,
	ExpiredLeaseRef,
	ExpiredLeaseRow,
	OnReapRowError,
} from './reaper';
