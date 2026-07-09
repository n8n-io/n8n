import { Time } from '@n8n/constants';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { backoff } from './backoff';
import { DEFAULT_EXECUTOR_OPTIONS, type ExecutorOptions } from './options';
import type { PrecisionTimer } from './precision-timer';
import type { ClaimedTaskRef, ClaimDueTasksBatch, ExecutorTaskStore } from './store';
import type { TaskHandlerRegistry } from './task-handler';
import type { ClaimedTask } from '../types';

type ClaimedEntry = { host: string; task: ClaimedTask };

/**
 * Observability callbacks for the executor's non-fatal incidents. Every one is
 * optional and already handled when it fires (released, left to the reaper);
 * the callsite only decides how to report it.
 */
export interface ExecutorHooks {
	/**
	 * The configured lookahead reaches or exceeds the lease, so a claimed task may
	 * lose its lease before it fires. Safe (the guards catch it) but wasteful;
	 * raised once, at construction.
	 */
	onLeaseShorterThanLookahead?: (context: { lookaheadMs: number; leaseMs: number }) => void;

	/**
	 * A claimed task's type had no handler at fire time (e.g. a rolling restart
	 * deregistered it); the claim was released without counting an attempt.
	 */
	onMissingHandler?: (task: ClaimedTask) => void;

	/**
	 * A detached fire rejected outside the handler-failure path (e.g. the outcome
	 * write failed); the row stays `running` for the reaper.
	 */
	onFireError?: (task: ClaimedTask, error: unknown) => void;

	/** A best-effort claim release failed; the reaper still recovers the row. */
	onReleaseError?: (taskId: string, error: unknown) => void;
}

/**
 * Claims due tasks, fires each at its `runAt`, dispatches to the handler registered
 * for its `taskType`, and records the outcome. Runs on every main; the claim's
 * locking guarantees each task is owned by one instance.
 *
 * This is the executor logic only: a driver (the multi-main loop) calls
 * {@link claimAndSchedule} on a cadence and supplies the instance host id. The
 * reaper that reclaims tasks whose lease expired is a separate concern (see
 * `reap` in `reaper/`).
 *
 * The terminal transitions are fenced on the lease epoch (the claim's `leaseEpoch`,
 * threaded into every terminal call as a {@link ClaimedTaskRef}), so a handler that stalls
 * past its lease and is reaped can't write its stale result over the recovered run:
 * while the row sits `pending` the `status = 'running'` guard rejects it, and once
 * another claim takes it the epoch has advanced, so the stale owner's guarded update
 * matches no row. Handlers are still expected to hand off quickly; the lease-renewal
 * heartbeat for longer ones is future work.
 *
 * Persistence sits behind the {@link ExecutorTaskStore} it is given, so this is only
 * the algorithm and a fake store is enough to test it.
 */
export class Executor {
	private readonly leaseMs: number;

	private readonly lookaheadMs: number;

	/**
	 * Claimed and scheduled but not yet fired, keyed by task id. Held so {@link stop}
	 * can release them on shutdown; dropped the instant a task's timer fires (then
	 * in-flight, not ours to release).
	 */
	private readonly claimedTaskById = new Map<string, ClaimedEntry>();

	/** Set by {@link stop}: claims resolving after it must be handed back, never scheduled. */
	private stopping = false;

	constructor(
		private readonly store: ExecutorTaskStore,
		private readonly registry: TaskHandlerRegistry,
		private readonly timer: PrecisionTimer,
		private readonly options: ExecutorOptions = DEFAULT_EXECUTOR_OPTIONS,
		private readonly hooks: ExecutorHooks = {},
	) {
		this.leaseMs = options.leaseSeconds * Time.seconds.toMilliseconds;
		// Claim one driver tick ahead so a task due before the next tick fires precisely
		// on the timer, at the cost of holding its claim until then.
		this.lookaheadMs = options.lookaheadSeconds * Time.seconds.toMilliseconds;

		if (this.lookaheadMs >= this.leaseMs) {
			this.hooks.onLeaseShorterThanLookahead?.({
				lookaheadMs: this.lookaheadMs,
				leaseMs: this.leaseMs,
			});
		}
	}

	/**
	 * One tick: claim the due tasks this instance can run and schedule each to fire at
	 * its `runAt`. Returns the claimed tasks (for tests/observability). Only the claim
	 * is atomic; the per-row scheduling and any release are deliberately separate
	 * writes (a failed one is recovered by the reaper), not one enclosing transaction.
	 *
	 * `signal` is the driver's abandonment marker: a tick that outlives its timeout is
	 * aborted and its claim may still resolve later — possibly after {@link stop} already
	 * released everything. Scheduling then would arm timers nobody cancels, so an aborted
	 * (or post-stop) claim is handed back instead and the tick reports nothing claimed.
	 */
	async claimAndSchedule(host: string, signal?: AbortSignal): Promise<ClaimedTask[]> {
		const taskTypes = this.registry.registeredTypes();
		if (taskTypes.length === 0) return [];

		const batch: ClaimDueTasksBatch = {
			host,
			taskTypes,
			lookaheadMs: this.lookaheadMs,
			leaseMs: this.leaseMs,
			batchSize: this.options.batchSize,
		};
		const tasks = await this.store.claimDueTasks(batch);

		// The pass's one cancellation point, right after its one await. The claim
		// is a single already-committed statement, so cancelling cannot roll it
		// back (contrast the materializer): it compensates, handing every row back.
		// `stopping` covers a claim resolving mid-shutdown even when no signal was
		// wired (e.g. a manual `SchedulerPasses.execute()`).
		if (this.stopping || signal?.aborted === true) {
			await this.handBackClaims(host, tasks);
			return [];
		}

		for (const task of tasks) {
			this.scheduleClaimed(host, task);
		}

		return tasks;
	}

	/**
	 * Compensate a claim that must not be scheduled (cancelled tick, or executor
	 * stopping): release each row back to `pending`, so the next tick — here or
	 * on another instance — picks it up. Scheduling instead would arm fire
	 * timers no teardown tracks. Best-effort like any release; a failed row is
	 * reported and left leased until the reaper recovers it.
	 */
	private async handBackClaims(host: string, tasks: ClaimedTask[]): Promise<void> {
		await Promise.all(
			tasks.map(
				async (task) =>
					await this.releaseClaimBestEffort({
						host,
						id: task.id,
						claimedEpoch: task.leaseEpoch,
					}),
			),
		);
	}

	/** Track a claimed task and schedule its timer to fire at `runAt`. */
	private scheduleClaimed(host: string, task: ClaimedTask): void {
		// Track before scheduling so a shutdown before it fires still releases it.
		this.claimedTaskById.set(task.id, { host, task });
		this.timer.schedule(task.runAt, () => {
			// Drop before firing: once firing it's in-flight, not stop()'s to release.
			this.claimedTaskById.delete(task.id);
			// Detached from the timer: swallow a mid-fire rejection so it isn't an
			// unhandled rejection. The row stays `running` for the reaper.
			this.fire(host, task).catch((error) => {
				this.hooks.onFireError?.(task, error);
			});
		});
	}

	/**
	 * Fire one claimed task: confirm it is still ours, dispatch to its handler, then
	 * record the outcome. A row that vanished (cascade-delete) or was reclaimed after
	 * a lease expiry is a benign no-op at every step, never an error.
	 */
	async fire(host: string, task: ClaimedTask): Promise<void> {
		const claim: ClaimedTaskRef = { host, id: task.id, claimedEpoch: task.leaseEpoch };

		// Resolve the handler before marking the task started: don't mark a task started
		// we can't run, and skip the write on the missing-handler path. The claim is
		// scoped to registered types, so this normally resolves; if the handler went away
		// (e.g. a rolling restart), release without counting an attempt so it isn't lost.
		const handler = this.registry.resolve(task.taskType);
		if (handler === undefined) {
			this.hooks.onMissingHandler?.(task);
			await this.releaseClaimBestEffort(claim);
			return;
		}

		// Guard + set `startedAt` in one write. 0 rows => deleted or reclaimed; don't
		// dispatch an execution for work that is gone or no longer ours.
		const started = await this.store.markStarted(claim);
		if (started === 0) return;

		// Record success only after the try, so a failure to record it isn't taken for a
		// handler failure. Such a failure propagates out (caught by the detached `.catch`
		// in claimAndSchedule) and leaves the row `running` for the reaper.
		try {
			await handler.execute(task);
		} catch (error) {
			const message = ensureError(error).message;
			const nextAttempts = task.attempts + 1;
			if (nextAttempts >= task.maxAttempts) {
				await this.store.failTaskTerminal(claim, message);
			} else {
				await this.store.rescheduleTask(claim, backoff(nextAttempts), message);
			}
			return;
		}

		await this.store.completeTask(claim);
	}

	/** Release a claim, reporting but swallowing failures: the reaper still recovers the row. */
	private async releaseClaimBestEffort(claim: ClaimedTaskRef): Promise<void> {
		try {
			await this.store.releaseClaim(claim);
		} catch (error) {
			this.hooks.onReleaseError?.(claim.id, error);
		}
	}

	/**
	 * Cancel scheduled-but-unfired timers and release their claims (shutdown); without
	 * the release they stay `running`+leased until the reaper reclaims them.
	 *
	 * Driver contract: stop calling {@link claimAndSchedule} before this. A tick whose
	 * claim is still in flight (e.g. abandoned at its timeout) is safe: once `stopping`
	 * is set, its late resolution hands the claims back instead of scheduling.
	 */
	async stop(): Promise<void> {
		this.stopping = true;
		this.timer.cancelAll();

		const entries = [...this.claimedTaskById.values()];
		const results = await Promise.allSettled(
			entries.map(
				async ({ host, task }) =>
					await this.store.releaseClaim({
						host,
						id: task.id,
						claimedEpoch: task.leaseEpoch,
					}),
			),
		);
		// allSettled preserves input order, so results line up with entries by index.
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				this.hooks.onReleaseError?.(entries[index].task.id, result.reason);
			}
		});
		this.claimedTaskById.clear();
	}
}
