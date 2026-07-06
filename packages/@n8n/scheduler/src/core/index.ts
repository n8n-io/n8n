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
 *
 * The public surface is deliberately just the `Scheduler` interface, the
 * `createScheduler` factory that composes the algorithms into it, and the types
 * reachable from their signatures. Everything else is internal.
 */

export { createScheduler } from './scheduler';
export type {
	Scheduler,
	SchedulerDeps,
	SchedulerEvent,
	SchedulerEventLevel,
	SchedulerTaskStore,
} from './scheduler';

export type { ClaimedTask } from './types';
export type { ExecutorOptions, TaskHandler } from './executor';
export type { MaterializerOptions, MaterializerSummary, RunInTransaction } from './materializer';
export type { ReaperOptions, ReapResult } from './reaper';
export type { RetentionOptions, RetentionSummary } from './retention';
