import { ensureError } from '@n8n/utils/errors/ensure-error';

import {
	DEFAULT_EXECUTOR_OPTIONS,
	Executor,
	PrecisionTimer,
	TaskHandlerRegistry,
} from './executor';
import type { ExecutorOptions, ExecutorTaskStore } from './executor';
import { DEFAULT_MATERIALIZER_OPTIONS, materialize } from './materializer';
import type { MaterializerOptions, RunInTransaction } from './materializer';
import { DEFAULT_REAPER_OPTIONS, reap } from './reaper';
import type { ReaperOptions, ReaperTaskStore } from './reaper';
import { DEFAULT_RETENTION_OPTIONS, prune } from './retention';
import type { RetentionOptions, RetentionStore } from './retention';
import type { Scheduler } from './scheduler';

export type SchedulerEventLevel = 'debug' | 'warn' | 'error';

/**
 * An incident or notable outcome from a pass, already handled where it fired.
 * The host only decides how to report it (typically: route to its logger).
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
	materializerTransaction: RunInTransaction;

	taskStore: SchedulerTaskStore;

	/** Per-pass tuning; anything omitted falls back to the pass's defaults. */
	materializer?: Partial<MaterializerOptions>;
	executor?: Partial<ExecutorOptions>;
	reaper?: Partial<ReaperOptions>;
	retention?: Partial<RetentionOptions>;

	onEvent?: (event: SchedulerEvent) => void;
}

/**
 * A plain `{ ...defaults, ...overrides }` would let an explicitly-undefined
 * override clobber a default (turning e.g. `leaseMs` into `NaN` downstream),
 * so undefined entries are treated as absent.
 */
function withDefaults<T extends object>(defaults: T, overrides: Partial<T> = {}): T {
	const merged = { ...defaults };
	for (const key of Object.keys(overrides) as Array<keyof T>) {
		const value = overrides[key];
		if (value !== undefined) {
			merged[key] = value;
		}
	}
	return merged;
}

/**
 * Compose the core algorithms into a {@link Scheduler}: a registry and an
 * {@link Executor} over `taskStore`, plus the materializer, reaper and
 * retention passes bound to their options, with every incident routed to
 * `onEvent` as a described {@link SchedulerEvent}.
 */
export function createScheduler(deps: SchedulerDeps): Scheduler {
	const { hostId, materializerTransaction, taskStore, onEvent } = deps;
	const materializerOptions = withDefaults(DEFAULT_MATERIALIZER_OPTIONS, deps.materializer);
	const executorOptions = withDefaults(DEFAULT_EXECUTOR_OPTIONS, deps.executor);
	const reaperOptions = withDefaults(DEFAULT_REAPER_OPTIONS, deps.reaper);
	const retentionOptions = withDefaults(DEFAULT_RETENTION_OPTIONS, deps.retention);

	const emit = (level: SchedulerEventLevel, message: string, context: Record<string, unknown>) => {
		// The sink is the reporting channel itself: if it throws (a broken logger),
		// there is nothing left to report through, and the pass that emitted must
		// not be broken by its own observability.
		try {
			onEvent?.({ level, message, context });
		} catch {
			// Deliberately swallowed; see above.
		}
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
			return await materialize(materializerTransaction, materializerOptions, {
				onPlanError: (job, error) => {
					emit('error', 'Scheduler could not plan a job schedule; deferred for retry', {
						jobId: job.id,
						error: described(error),
					});
				},
				onSkippedDuplicates: (context) => {
					emit('debug', 'Scheduler materializer skipped occurrences that were already recorded', {
						...context,
					});
				},
			});
		},

		async execute() {
			return await executor.claimAndSchedule(hostId);
		},

		async reap() {
			return await reap(taskStore, reaperOptions, {
				onRowError: (taskId, error) => {
					emit(
						'error',
						'Scheduler could not recover an expired task; skipped until the next sweep',
						{ taskId, error: described(error) },
					);
				},
				onDeadLetter: (task) => {
					emit('warn', 'Scheduler dead-lettered a task; its last attempt lost its lease', {
						...task,
					});
				},
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
