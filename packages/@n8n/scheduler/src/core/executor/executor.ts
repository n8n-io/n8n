import { Time } from '@n8n/constants';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { backoff } from './backoff';
import { LeaseLostError, TaskTimeoutError } from '../errors';
import { LONG_RUN_THRESHOLD_IN_LEASES, MIN_RENEWAL_INTERVAL_MS } from './lease-constants';
import { LeaseHeartbeat } from './lease-heartbeat';
import type { LeaseRenewalResult } from './lease-heartbeat';
import { DEFAULT_EXECUTOR_OPTIONS, type ExecutorOptions } from './options';
import type { PrecisionTimer } from './precision-timer';
import type { ClaimedTaskRef, ClaimDueTasksBatch, ExecutorTaskStore } from './store';
import { createDispatchReporter } from './task-handler';
import type { DispatchReporter, TaskHandler, TaskHandlerRegistry } from './task-handler';
import { noopExecutorTracing } from './tracing';
import type { ExecutorTracing, FireResult } from './tracing';
import { Alarm } from '../lifecycle/alarm';
import type { ClaimedTask } from '../types';

type ClaimedEntry = { host: string; task: ClaimedTask };

type HeartbeatRun = {
	claim: ClaimedTaskRef;
	/** `performance.now()` just before the write that last set the lease. */
	leaseSetAt: number;
	isMarkedDispatched: () => boolean;
};

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
	 * The lease is too short to be renewed, so a task that runs longer than the
	 * lease may be stopped and run again. Raised once, at construction.
	 */
	onLeaseShorterThanRenewalInterval?: (context: {
		leaseMs: number;
		minRenewalIntervalMs: number;
	}) => void;

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

	/** A lease renewal write failed; the next renewal tries again. */
	onLeaseRenewalError?: (task: ClaimedTask, error: unknown) => void;

	/**
	 * A handler is still running after many leases, so it may be stuck. Fires once a
	 * run, and only for a run whose timeout comes later.
	 */
	onLongRunningTask?: (task: ClaimedTask, runningSeconds: number) => void;

	/**
	 * A run reached the timeout of its occurrence. Its signal is aborted and its
	 * lease is no longer renewed. Fires once a run.
	 */
	onTaskTimeout?: (task: ClaimedTask) => void;

	// Fire-path metrics hooks (the normal path), distinct from the incident hooks above.

	/** A claimed task was dispatched to its handler; `lagSeconds` is fire time minus its effective `runAt` (clamped >= 0). */
	onDispatch?: (taskType: string, lagSeconds: number) => void;
	/** A fire reached a terminal outcome: the handler completed ('success') or exhausted its attempts ('failure'). */
	onFire?: (taskType: string, result: 'success' | 'failure') => void;
	/** A fire failed but has attempts left; it was rescheduled with backoff. */
	onRetry?: (taskType: string) => void;
	/**
	 * A handler finished but its terminal write matched no row: the lease was
	 * reclaimed while the handler ran, so another instance may have run the same
	 * occurrence concurrently. This is the at-least-once contract's residual
	 * overlap, surfaced so it can be counted.
	 */
	onLeaseLost?: (taskType: string) => void;
	/**
	 * A running handler's lease was renewed, a renewal found its claim gone
	 * ('lost'), or no renewal succeeded for a whole lease ('expired').
	 * Both of the latter abort the handler's signal before dispatch.
	 */
	onLeaseRenewal?: (task: ClaimedTask, result: LeaseRenewalResult) => void;
}

/**
 * Claims due tasks, fires each at its `runAt`, dispatches to the handler registered
 * for its `taskType`, and records the outcome. Runs on every main; the claim's
 * locking guarantees no two instances *claim* a task at once. Before running a
 * handler the executor takes a pre-dispatch mutex ({@link ExecutorTaskStore.beginDispatch}):
 * an atomic compare-and-set that stamps `startedAt` and returns 1 for a single
 * winner, so the handler runs at most once per lease. That same write refreshes the
 * lease, and a heartbeat renews it while the handler runs, so a long handler keeps
 * its claim for as long as its instance is alive, up to the timeout of its occurrence.
 *
 * The contract is at-least-once. Ownership only lasts as long as the lease: if an
 * owner is lost past it (crash or partition), the reaper reclaims the row, clears
 * `startedAt`, and another instance re-acquires the mutex and runs the handler again
 * so the occurrence is not lost. A genuinely stalled-but-alive owner keeps its
 * (refreshed) lease, so it is not reclaimed and no second handler overlaps it. The
 * one residual overlap is a partitioned owner still running while its lease is
 * reclaimed; there the unique `deduplicationKey` index on `execution_entity`
 * suppresses the duplicate effect. That index, not the claim, is the effect-level
 * backstop.
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
 * matches no row.
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
		private readonly tracing: ExecutorTracing = noopExecutorTracing,
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

		if (this.leaseMs <= MIN_RENEWAL_INTERVAL_MS) {
			this.hooks.onLeaseShorterThanRenewalInterval?.({
				leaseMs: this.leaseMs,
				minRenewalIntervalMs: MIN_RENEWAL_INTERVAL_MS,
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
	 * a lease expiry is skipped quietly at every step, never treated as an error.
	 *
	 * @returns How the fire ended; see {@link FireResult}.
	 */
	async fire(host: string, task: ClaimedTask): Promise<FireResult> {
		return await this.tracing.fire(host, task, async () => await this.runFire(host, task));
	}

	/** The actual fire logic. {@link fire} wraps it in the tracing hook. */
	private async runFire(host: string, task: ClaimedTask): Promise<FireResult> {
		const claim: ClaimedTaskRef = { host, id: task.id, claimedEpoch: task.leaseEpoch };

		// Resolve the handler before the ownership check: don't touch the DB for a task
		// we can't run, and skip on the missing-handler path. The claim is scoped to
		// registered types, so this normally resolves; if the handler went away (e.g. a
		// rolling restart), release without counting an attempt so it isn't lost.
		const handler = this.registry.resolve(task.taskType);
		if (handler === undefined) {
			this.hooks.onMissingHandler?.(task);
			await this.releaseClaimBestEffort(claim);
			return { outcome: 'skipped-no-handler' };
		}

		// Pre-dispatch mutex: atomically claim the sole right to run this occurrence's
		// handler for this lease, and refresh the lease for the execution window. 0 rows
		// => the row is gone, was reclaimed (epoch bumped), or was already dispatched on
		// this lease; in every case don't run the handler. This compare-and-set, not the
		// later marker, is what keeps the executor from calling a handler twice per lease.
		// Response time includes database latency and would overestimate the remaining lease.
		const leaseSetAt = performance.now();
		const won = await this.store.beginDispatch(claim, this.leaseMs);
		if (won === 0) {
			return { outcome: 'skipped-not-owned' };
		}

		// The task is confirmed ours and is being handed to its handler. Lag is measured
		// against `runAt` (the effective fire time, pushed forward by retry backoff), not
		// the fixed original slot, so a retry's backoff wait isn't logged as lag. The
		// timer's clock (the one scheduling used) is used, not a fresh wall clock, so a
		// skewed instance doesn't bias the lag it also scheduled against; clamp
		// non-negative since a timer can fire marginally early.
		const lagMs = this.timer.now() - task.runAt.getTime();
		const lagSeconds = Math.max(0, lagMs) / Time.seconds.toMilliseconds;
		this.hooks.onDispatch?.(task.taskType, lagSeconds);

		// `report.dispatched()` persists the `dispatchedAt` marker so the reaper can tell an
		// occurrence that ran from one that never did. The write is kicked off from the
		// (synchronous) callback and its promise captured, then settled before any terminal
		// write below so the marker can't land on (and be rejected by) an already-terminal
		// row. A failed marker write is reported, not thrown: losing it only costs a
		// redelivery, which the at-least-once contract accepts. `??=` makes a second call a
		// no-op, so an explicit `dispatched()` and the post-return fallback below collapse to
		// one write.
		let dispatchMark: Promise<void> | undefined;
		let isMarkedDispatched = false;
		const markDispatched = (): void => {
			dispatchMark ??= this.store.markDispatched(claim).then(
				(rowsAffected) => {
					isMarkedDispatched = rowsAffected > 0;
				},
				(error: unknown) => this.hooks.onFireError?.(task, error),
			);
		};
		const report = createDispatchReporter(markDispatched);
		const run = new AbortController();

		// Record success only after the try, so a failure to record it isn't taken for a
		// handler failure. Such a failure propagates out (caught by the detached `.catch`
		// in claimAndSchedule) and leaves the row `running` for the reaper.
		try {
			await this.executeWithHeartbeat(handler, task, report, run, {
				claim,
				leaseSetAt,
				isMarkedDispatched: () => isMarkedDispatched,
			});
		} catch (error) {
			await dispatchMark;
			return await this.recordHandlerFailure(task, claim, error, {
				dispatchWasReported: dispatchMark !== undefined,
				timedOut: run.signal.reason instanceof TaskTimeoutError,
			});
		}

		markDispatched(); // A handler that returned without throwing is considered as dispatched
		await dispatchMark;
		const rowsAffected = await this.store.completeTask(claim);
		if (rowsAffected > 0) {
			this.hooks.onFire?.(task.taskType, 'success');
			return { outcome: 'completed' };
		}
		this.hooks.onLeaseLost?.(task.taskType);
		return { outcome: 'skipped-not-owned' };
	}

	private async recordHandlerFailure(
		task: ClaimedTask,
		claim: ClaimedTaskRef,
		error: unknown,
		{ dispatchWasReported, timedOut }: { dispatchWasReported: boolean; timedOut: boolean },
	): Promise<FireResult> {
		const errorMessage = ensureError(error).message;
		const nextAttempts = task.attempts + 1;
		// A dispatched run that timed out is completed, as the reaper completes it
		// when the handler ignores its signal.
		if (nextAttempts < task.maxAttempts && !(dispatchWasReported && timedOut)) {
			const rowsAffected = await this.store.rescheduleTask(
				claim,
				backoff(nextAttempts),
				errorMessage,
			);
			if (rowsAffected > 0) {
				this.hooks.onRetry?.(task.taskType);
				return { outcome: 'rescheduled', errorMessage };
			}
			this.hooks.onLeaseLost?.(task.taskType);
			return { outcome: 'skipped-not-owned', errorMessage };
		}

		// On the last attempt or a timeout, complete work whose effect was handed off before the error.
		// The report counts even if its marker write failed.
		if (dispatchWasReported) {
			const rowsAffected = await this.store.completeTask(claim);
			if (rowsAffected > 0) {
				this.hooks.onFire?.(task.taskType, 'success');
				return { outcome: 'completed' };
			}
			this.hooks.onLeaseLost?.(task.taskType);
			return { outcome: 'skipped-not-owned', errorMessage };
		}

		// Zero rows means the claim is gone. Report no transition that we did not make.
		const rowsAffected = await this.store.failTaskTerminal(claim, errorMessage);
		if (rowsAffected > 0) {
			this.hooks.onFire?.(task.taskType, 'failure');
			return { outcome: 'dead-lettered', errorMessage };
		}
		this.hooks.onLeaseLost?.(task.taskType);
		return { outcome: 'skipped-not-owned', errorMessage };
	}

	/**
	 * Run the handler while a heartbeat renews the claim's lease, until it settles.
	 * A lost claim aborts `run` unless the dispatch marker is stored. The timeout
	 * of the occurrence aborts `run` and stops the renewals.
	 */
	private async executeWithHeartbeat(
		handler: TaskHandler,
		task: ClaimedTask,
		report: DispatchReporter,
		run: AbortController,
		{ claim, leaseSetAt, isMarkedDispatched }: HeartbeatRun,
	): Promise<void> {
		const heartbeat = new LeaseHeartbeat(
			async (expiresInMs) => await this.store.renewLease(claim, expiresInMs),
			{ leaseDurationMs: this.leaseMs, leaseSetAt },
			{
				onRenewal: (result) => {
					this.hooks.onLeaseRenewal?.(task, result);
					// The reaper completes an occurrence whose marker is stored and never runs
					// it again, so stopping its run would only leave the work half done. A
					// marker write still in flight counts as not stored: the reaper may
					// already redeliver the row, and that write may never finish.
					if (result !== 'renewed' && !isMarkedDispatched()) {
						run.abort(new LeaseLostError());
					}
				},
				onRenewalError: (error) => this.hooks.onLeaseRenewalError?.(task, error),
			},
		);
		const timeoutMs = task.timeoutSeconds * Time.seconds.toMilliseconds;
		// A run whose timeout comes first gets the timeout warning instead.
		const longRunMs = LONG_RUN_THRESHOLD_IN_LEASES * this.leaseMs;
		const longRun = new Alarm(() => performance.now());
		if (longRunMs < timeoutMs) {
			longRun.set(leaseSetAt + longRunMs, () =>
				this.hooks.onLongRunningTask?.(task, longRunMs / Time.seconds.toMilliseconds),
			);
		}
		const deadline = leaseSetAt + timeoutMs;
		const timeout = new Alarm(() => performance.now());
		timeout.set(deadline, () => {
			// Without renewals the lease expires, so the reaper recovers a handler that
			// ignores its signal.
			heartbeat.stop();
			if (!run.signal.aborted) {
				this.hooks.onTaskTimeout?.(task);
				run.abort(new TaskTimeoutError(task.timeoutSeconds));
			}
		});
		try {
			await handler.execute(task, report, run.signal, deadline);
		} finally {
			longRun.cancel();
			timeout.cancel();
			heartbeat.stop();
		}
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
