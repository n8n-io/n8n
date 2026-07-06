import { ensureError } from '@n8n/utils/errors/ensure-error';

import {
	DEFAULT_EXECUTOR_OPTIONS,
	Executor,
	PrecisionTimer,
	TaskHandlerRegistry,
} from './executor';
import type { ExecutorOptions, ExecutorTaskStore, TaskHandler } from './executor';
import { DEFAULT_MATERIALIZER_OPTIONS, materialize } from './materializer';
import type { MaterializerOptions, MaterializerSummary, RunInTransaction } from './materializer';
import { DEFAULT_REAPER_OPTIONS, reap } from './reaper';
import type { ReaperOptions, ReaperTaskStore, ReapResult } from './reaper';
import { DEFAULT_RETENTION_OPTIONS, prune } from './retention';
import type { RetentionOptions, RetentionStore, RetentionSummary } from './retention';
import type { ClaimedTask } from './types';

/**
 * The package's single composition surface: what a host must provide to run the
 * durable scheduler. {@link createScheduler} is its canonical implementation;
 * the host only binds storage, tuning and an event sink (see
 * {@link SchedulerDeps}) — none of which this package knows about.
 *
 * Handlers register up front; the passes are separate accessors rather than one
 * `tick` because each runs on its own cadence, and the driver owns those timers.
 */
export interface Scheduler {
	/**
	 * Register the handler that runs tasks of `taskType`. The executor claims
	 * only registered types, so an instance never picks up work it cannot run.
	 */
	registerTaskHandler(taskType: string, handler: TaskHandler): void;

	/** One materializer pass: record upcoming occurrences of due jobs as tasks. */
	materialize(): Promise<MaterializerSummary>;

	/**
	 * One executor tick: claim the due tasks this instance can run and schedule
	 * each to fire at its `runAt`. Returns the claimed tasks.
	 */
	execute(): Promise<ClaimedTask[]>;

	/** One reaper sweep: recover tasks stranded by an expired lease. */
	reap(): Promise<ReapResult>;

	/** One retention pass: delete finished tasks past their windows. */
	prune(): Promise<RetentionSummary>;

	/** Cancel unfired timers and release their claims (shutdown). */
	stop(): Promise<void>;
}

export type SchedulerEventLevel = 'debug' | 'warn' | 'error';

/**
 * An incident or notable outcome from a pass, already handled where it fired;
 * the host only decides how to report it (typically: route to its logger).
 */
export interface SchedulerEvent {
	level: SchedulerEventLevel;
	message: string;
	context: Record<string, unknown>;
}

/**
 * Task storage for the executor, reaper and retention passes. The `@n8n/db`
 * `ScheduledTaskRepository` satisfies the intersection structurally, so the
 * host passes it as-is.
 */
export type SchedulerTaskStore = ExecutorTaskStore & ReaperTaskStore & RetentionStore;

/** What a host binds to compose a {@link Scheduler}. */
export interface SchedulerDeps {
	/** Stable identity of this instance, stamped on every claim. */
	hostId: string;

	/** Runs one materializer pass inside one storage transaction. */
	runInTransaction: RunInTransaction;

	taskStore: SchedulerTaskStore;

	/** Per-pass tuning; anything omitted falls back to the pass's defaults. */
	materializer?: Partial<MaterializerOptions>;
	executor?: Partial<ExecutorOptions>;
	reaper?: Partial<ReaperOptions>;
	retention?: Partial<RetentionOptions>;

	onEvent?: (event: SchedulerEvent) => void;
}

/**
 * Compose the core algorithms into a {@link Scheduler}: a registry and an
 * {@link Executor} over `taskStore`, plus the materializer, reaper and
 * retention passes bound to their options, with every incident routed to
 * `onEvent` as a described {@link SchedulerEvent}.
 */
export function createScheduler(deps: SchedulerDeps): Scheduler {
	const { hostId, runInTransaction, taskStore, onEvent } = deps;
	const materializerOptions = { ...DEFAULT_MATERIALIZER_OPTIONS, ...deps.materializer };
	const executorOptions = { ...DEFAULT_EXECUTOR_OPTIONS, ...deps.executor };
	const reaperOptions = { ...DEFAULT_REAPER_OPTIONS, ...deps.reaper };
	const retentionOptions = { ...DEFAULT_RETENTION_OPTIONS, ...deps.retention };

	const emit = (level: SchedulerEventLevel, message: string, context: Record<string, unknown>) => {
		onEvent?.({ level, message, context });
	};
	const described = (error: unknown) => ensureError(error).message;

	const registry = new TaskHandlerRegistry();
	const executor = new Executor(taskStore, registry, new PrecisionTimer(), executorOptions, {
		onLeaseShorterThanLookahead: (context) => {
			emit(
				'warn',
				'Scheduler executor lookahead reaches or exceeds the lease; claimed tasks may lose their lease before firing',
				{ ...context },
			);
		},
		onMissingHandler: (task) => {
			emit('warn', 'Scheduler claimed a task with no registered handler; claim released', {
				taskId: task.id,
				taskType: task.taskType,
			});
		},
		onFireError: (task, error) => {
			emit('error', 'Scheduler could not record a task outcome; left for the reaper', {
				taskId: task.id,
				error: described(error),
			});
		},
		onReleaseError: (taskId, error) => {
			emit('error', 'Scheduler failed to release a claimed task; left for the reaper', {
				taskId,
				error: described(error),
			});
		},
	});

	if (retentionOptions.failedRetentionSeconds < retentionOptions.retentionSeconds) {
		emit(
			'warn',
			'Scheduler retention keeps failed runs shorter than succeeded ones; failure evidence will be deleted first',
			{
				retentionSeconds: retentionOptions.retentionSeconds,
				failedRetentionSeconds: retentionOptions.failedRetentionSeconds,
			},
		);
	}

	return {
		registerTaskHandler(taskType, handler) {
			registry.register(taskType, handler);
		},

		async materialize() {
			return await materialize(runInTransaction, materializerOptions, (job, error) => {
				emit('error', 'Scheduler could not plan a job schedule; deferred for retry', {
					jobId: job.id,
					error: described(error),
				});
			});
		},

		async execute() {
			return await executor.claimAndSchedule(hostId);
		},

		async reap() {
			return await reap(taskStore, reaperOptions, (taskId, error) => {
				emit('error', 'Scheduler could not recover an expired task; skipped until the next sweep', {
					taskId,
					error: described(error),
				});
			});
		},

		async prune() {
			const summary = await prune(taskStore, retentionOptions);
			if (!summary.drained) {
				emit('warn', 'Scheduler retention pass hit its batch budget; backlog remains', {
					...summary,
				});
			} else if (summary.deleted > 0) {
				emit('debug', 'Scheduler retention deleted finished tasks', { ...summary });
			}
			return summary;
		},

		async stop() {
			await executor.stop();
		},
	};
}
