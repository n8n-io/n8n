import { Logger } from '@n8n/backend-common';
import { SchedulerConfig } from '@n8n/config';
import { ScheduledTaskRepository, type ClaimDueTasksOptions } from '@n8n/db';
import { Service } from '@n8n/di';

import { backoff } from './backoff';
import { PrecisionTimer } from './precision-timer';
import { TaskHandlerRegistry } from './task-handler';
import type { ClaimedTask } from '../core/types';
import { entityToClaimedTask } from '../storage/mappers';

type ClaimedEntry = { host: string; task: ClaimedTask };

/** Default cap on how many tasks a single claim takes. */
const DEFAULT_CLAIM_BATCH_SIZE = 100;

/**
 * Claims due tasks, fires each at its exact `runAt`, dispatches to the handler
 * registered for its `taskType`, and records the outcome. Runs on every main; the
 * claim's locking guarantees each task is owned by exactly one instance.
 *
 * This is the executor logic only: a driver (the multi-main loop) calls
 * {@link claimAndSchedule} on a cadence and supplies the instance host id. The
 * reaper that reclaims tasks whose lease expired is a separate concern.
 *
 * The terminal transitions are guarded on `claimedBy` (not the lease epoch), so a
 * handler must finish within the lease; fencing against a stalled-then-reclaimed
 * owner lands with the reaper. Handlers are expected to hand off quickly; the
 * lease-renewal heartbeat for longer ones lands with the reaper too.
 */
@Service()
export class Executor {
	private readonly leaseMs: number;

	private readonly lookaheadMs: number;

	private readonly batchSize = DEFAULT_CLAIM_BATCH_SIZE;

	/**
	 * Tasks claimed and scheduled but not yet fired, keyed by task id. Held so
	 * {@link stop} can release their claims on shutdown; a task is removed the
	 * instant its timer callback begins firing (it is then in-flight, not ours to
	 * release).
	 */
	private readonly claimed = new Map<string, ClaimedEntry>();

	constructor(
		private readonly taskRepository: ScheduledTaskRepository,
		private readonly registry: TaskHandlerRegistry,
		private readonly timer: PrecisionTimer,
		private readonly logger: Logger,
		config: SchedulerConfig,
	) {
		this.leaseMs = config.leaseDuration * 1000;
		// Claim one poll interval ahead so a task due before the next tick is claimed
		// now and fired precisely by the timer, at the cost of holding its claim for
		// up to one interval before it actually fires.
		this.lookaheadMs = config.executorInterval * 1000;
	}

	/**
	 * One executor tick: claim the due tasks this instance can run and schedule each
	 * to fire at its `runAt`. Returns the claimed tasks (for tests/observability).
	 *
	 * Only the claim is atomic (it runs its own dialect-split locking transaction in
	 * the repository); the per-row scheduling and any best-effort release below are
	 * independent writes, not one enclosing transaction.
	 */
	async claimAndSchedule(host: string): Promise<ClaimedTask[]> {
		const taskTypes = this.registry.registeredTypes();
		if (taskTypes.length === 0) return [];

		const claim: ClaimDueTasksOptions = {
			host,
			taskTypes,
			lookaheadMs: this.lookaheadMs,
			leaseMs: this.leaseMs,
			batchSize: this.batchSize,
		};
		const rows = await this.taskRepository.claimDueTasks(claim);
		const tasks: ClaimedTask[] = [];
		for (const row of rows) {
			let task: ClaimedTask;
			try {
				task = entityToClaimedTask(row);
			} catch (error) {
				// A corrupt claimed row must not abort scheduling for the rest of the
				// batch. Release it (best effort) so it returns to pending rather than
				// staying stranded `running` until the reaper.
				this.logger.error('Scheduler executor could not map claimed task; releasing it', {
					taskId: row.id,
					error,
				});
				try {
					await this.taskRepository.releaseClaim(host, row.id);
				} catch {
					// Best effort: the reaper still recovers the row if the release fails.
				}
				continue;
			}

			tasks.push(task);
			// Track before scheduling so a shutdown between here and firing still
			// releases the claim.
			this.claimed.set(task.id, { host, task });
			this.timer.schedule(task.runAt, () => {
				// A task that has begun firing is in-flight and must not be released by
				// stop(); drop it from the claimed set first.
				this.claimed.delete(task.id);
				// Detached from the timer; a rejection here (e.g. a transient DB error
				// mid-fire) must not become an unhandled rejection. The row stays
				// `running` and the reaper recovers it once the lease expires.
				this.fire(host, task).catch((error) => {
					this.logger.error('Scheduler executor failed to fire task', {
						taskId: task.id,
						taskType: task.taskType,
						error,
					});
				});
			});
		}

		return tasks;
	}

	/**
	 * Fire one claimed task: confirm it is still ours, dispatch to its handler, then
	 * record the outcome. A row that vanished (cascade-delete) or was reclaimed after
	 * a lease expiry is a benign no-op at every step, never an error.
	 */
	async fire(host: string, task: ClaimedTask): Promise<void> {
		// Guard + set `startedAt` in one write. 0 rows => deleted or reclaimed; don't
		// dispatch an execution for work that is gone or no longer ours.
		const started = await this.taskRepository.markStarted(host, task.id);
		if (started === 0) return;

		const handler = this.registry.resolve(task.taskType);
		// The claim is scoped to registered types, so this is expected to resolve.
		// If the handler went away between claim and fire (e.g. a rolling restart),
		// release the claim without counting an attempt so the occurrence isn't lost;
		// another instance or a later tick runs it once a handler is present again.
		if (handler === undefined) {
			this.logger.warn('Scheduler executor found no handler for claimed task; releasing it', {
				taskId: task.id,
				taskType: task.taskType,
			});
			await this.taskRepository.releaseClaim(host, task.id);
			return;
		}

		// Only the handler is guarded by the retry path: a handler failure is a task
		// failure. Recording success happens after the try, so a failure to record it
		// is not misrecorded as a task failure. It propagates out of fire() (caught by
		// the detached `.catch` in claimAndSchedule) and leaves the row `running` for
		// the reaper to recover.
		try {
			await handler.execute(task);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const nextAttempts = task.attempts + 1;
			if (nextAttempts >= task.maxAttempts) {
				await this.taskRepository.failTaskTerminal(host, task.id, message);
			} else {
				await this.taskRepository.rescheduleTask(host, task.id, backoff(nextAttempts), message);
			}
			return;
		}

		await this.taskRepository.completeTask(host, task.id);
	}

	/**
	 * Cancel scheduled-but-not-yet-fired timers and release the claims held for them
	 * (shutdown). Without the release, claimed-but-unfired tasks stay `running`+leased
	 * and are orphaned until the reaper reclaims them.
	 *
	 * Driver contract: the caller must stop invoking {@link claimAndSchedule} before
	 * calling this. There is no in-flight guard, so a concurrent `claimAndSchedule`
	 * could schedule timers after `cancelAll` whose entries `claimed.clear()` then
	 * drops, leaving those tasks to fire post-stop and be recovered only by the
	 * reaper. A tick and stop must not overlap.
	 */
	async stop(): Promise<void> {
		this.timer.cancelAll();

		const results = await Promise.allSettled(
			[...this.claimed.values()].map(
				async ({ host, task }) => await this.taskRepository.releaseClaim(host, task.id),
			),
		);
		for (const result of results) {
			if (result.status === 'rejected') {
				this.logger.error('Scheduler executor failed to release claim on shutdown', {
					error: result.reason,
				});
			}
		}
		this.claimed.clear();
	}
}
