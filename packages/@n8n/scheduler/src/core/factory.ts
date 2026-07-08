import { Time } from '@n8n/constants';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { InvalidLifecycleOptionsError } from './errors';
import {
	DEFAULT_EXECUTOR_OPTIONS,
	Executor,
	PrecisionTimer,
	TaskHandlerRegistry,
} from './executor';
import type { ExecutorOptions, ExecutorTaskStore } from './executor';
import { DEFAULT_LIFECYCLE_OPTIONS, Loop } from './lifecycle';
import type { LifecycleOptions } from './lifecycle';
import { DEFAULT_MATERIALIZER_OPTIONS, materialize } from './materializer';
import type { MaterializerOptions, RunInTransaction } from './materializer';
import { DEFAULT_REAPER_OPTIONS, reap } from './reaper';
import type { ReaperOptions, ReaperTaskStore } from './reaper';
import { DEFAULT_RETENTION_OPTIONS, prune } from './retention';
import type { RetentionOptions, RetentionStore } from './retention';
import type { Scheduler, SchedulerPasses } from './scheduler';

export type SchedulerEventLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A lifecycle milestone, incident or notable outcome the scheduler reports,
 * already handled where it fired. The host only decides how to report it
 * (typically: route to its logger).
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

	/** Cadences of the loops `start` runs, one per pass. */
	lifecycle?: Partial<LifecycleOptions>;

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
 * `onEvent` as a described {@link SchedulerEvent}. `start` runs each pass on
 * its own jittered {@link Loop}; `stop` drains them.
 */
export function createScheduler(deps: SchedulerDeps): Scheduler & SchedulerPasses {
	const { hostId, materializerTransaction, taskStore, onEvent } = deps;
	const materializerOptions = withDefaults(DEFAULT_MATERIALIZER_OPTIONS, deps.materializer);
	const executorOptions = withDefaults(DEFAULT_EXECUTOR_OPTIONS, deps.executor);
	const reaperOptions = withDefaults(DEFAULT_REAPER_OPTIONS, deps.reaper);
	const retentionOptions = withDefaults(DEFAULT_RETENTION_OPTIONS, deps.retention);
	const lifecycleOptions = withDefaults(DEFAULT_LIFECYCLE_OPTIONS, deps.lifecycle);

	if (!(lifecycleOptions.jitterRatio >= 0 && lifecycleOptions.jitterRatio < 1)) {
		throw new InvalidLifecycleOptionsError(
			`jitterRatio must be at least 0 and below 1, got ${lifecycleOptions.jitterRatio}`,
		);
	}

	// A non-positive or NaN interval collapses to setTimeout's 1ms floor,
	// turning the pass into a hot loop against task storage.
	// A non-positive or NaN timeout would abandon every pass the moment it starts.
	const durationKeys = [
		'materializerIntervalSeconds',
		'executorIntervalSeconds',
		'reaperIntervalSeconds',
		'retentionIntervalSeconds',
		'materializerTimeoutSeconds',
		'executorTimeoutSeconds',
		'reaperTimeoutSeconds',
		'retentionTimeoutSeconds',
	] as const;
	for (const key of durationKeys) {
		const value = lifecycleOptions[key];
		if (!(Number.isFinite(value) && value > 0)) {
			throw new InvalidLifecycleOptionsError(
				`${key} must be a positive number of seconds, got ${value}`,
			);
		}
	}

	if (
		lifecycleOptions.concurrencyMode !== 'sequential' &&
		lifecycleOptions.concurrencyMode !== 'concurrent'
	) {
		throw new InvalidLifecycleOptionsError(
			`concurrencyMode must be 'sequential' or 'concurrent', got ${String(lifecycleOptions.concurrencyMode)}`,
		);
	}

	const { maxConcurrentPasses } = lifecycleOptions;
	if (!(Number.isInteger(maxConcurrentPasses) && maxConcurrentPasses >= 1)) {
		throw new InvalidLifecycleOptionsError(
			`maxConcurrentPasses must be a positive integer, got ${maxConcurrentPasses}`,
		);
	}

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

	const runMaterialize = async (signal?: AbortSignal) =>
		await materialize(
			materializerTransaction,
			materializerOptions,
			{
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
			},
			signal,
		);

	const runExecute = async (signal?: AbortSignal) =>
		await executor.claimAndSchedule(hostId, signal);

	const runReap = async (signal?: AbortSignal) =>
		await reap(
			taskStore,
			reaperOptions,
			{
				onRowError: (taskId, error) => {
					emit(
						'error',
						'Scheduler could not recover an expired task; skipped until the next sweep',
						{
							taskId,
							error: described(error),
						},
					);
				},
				onDeadLetter: (task) => {
					emit('warn', 'Scheduler dead-lettered a task; its last attempt lost its lease', {
						...task,
					});
				},
			},
			signal,
		);

	const runPrune = async (signal?: AbortSignal) => {
		const summary = await prune(taskStore, retentionOptions, signal);
		if (!summary.drained && signal?.aborted !== true) {
			emit('warn', 'Scheduler retention pass hit its batch budget; backlog remains', {
				...summary,
			});
		} else if (summary.drained && summary.deleted > 0) {
			emit('debug', 'Scheduler retention deleted finished tasks', { ...summary });
		}
		return summary;
	};

	const loopOver = (
		pass: string,
		run: (signal: AbortSignal) => Promise<unknown>,
		intervalSeconds: number,
		timeoutSeconds: number,
	) =>
		new Loop(
			run,
			{
				intervalMs: intervalSeconds * Time.seconds.toMilliseconds,
				jitterRatio: lifecycleOptions.jitterRatio,
				timeoutMs: timeoutSeconds * Time.seconds.toMilliseconds,
				concurrency: lifecycleOptions.concurrencyMode,
				maxConcurrent: lifecycleOptions.maxConcurrentPasses,
			},
			{
				onError: (error) => {
					emit('error', 'Scheduler pass failed; retrying on its next tick', {
						pass,
						error: described(error),
					});
				},
				onTimeout: ({ timeoutMs }) => {
					emit('error', 'Scheduler pass timed out and was abandoned; retrying on its next tick', {
						pass,
						timeoutMs,
					});
				},
				onSkippedTick: ({ inFlight, limit }) => {
					emit('warn', 'Scheduler pass tick dropped; in-flight passes at the concurrency limit', {
						pass,
						inFlight,
						limit,
					});
				},
			},
		);

	const loops = [
		loopOver(
			'materializer',
			runMaterialize,
			lifecycleOptions.materializerIntervalSeconds,
			lifecycleOptions.materializerTimeoutSeconds,
		),
		loopOver(
			'executor',
			runExecute,
			lifecycleOptions.executorIntervalSeconds,
			lifecycleOptions.executorTimeoutSeconds,
		),
		loopOver(
			'reaper',
			runReap,
			lifecycleOptions.reaperIntervalSeconds,
			lifecycleOptions.reaperTimeoutSeconds,
		),
		loopOver(
			'retention',
			runPrune,
			lifecycleOptions.retentionIntervalSeconds,
			lifecycleOptions.retentionTimeoutSeconds,
		),
	];

	let started = false;
	let stopping: Promise<void> | undefined;

	return {
		registerTaskHandler(taskType, handler) {
			registry.register(taskType, handler);
		},

		materialize: runMaterialize,

		execute: runExecute,

		reap: runReap,

		prune: runPrune,

		start() {
			if (!started && stopping === undefined) {
				started = true;
				for (const loop of loops) {
					loop.start();
				}
				emit('info', 'Scheduler started', { hostId });
			}
		},

		async stop() {
			// Cache the teardown so overlapping `stop()` calls await the one run
			// instead of the second returning before the first has finished.
			stopping ??= (async () => {
				// Loops first, each draining its in-flight passes (bounded by their
				// timeouts), so no executor tick overlaps the executor teardown.
				await Promise.all(loops.map(async (loop) => await loop.stop()));
				await executor.stop();
				if (started) {
					emit('info', 'Scheduler stopped', { hostId });
				}
			})();
			await stopping;
		},
	};
}
