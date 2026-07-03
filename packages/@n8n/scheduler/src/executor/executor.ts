import type { Logger } from '@n8n/backend-common';
import type { SchedulerConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type {
	ClaimDueTasksOptions,
	ClaimRef,
	ScheduledTask,
	ScheduledTaskRepository,
} from '@n8n/db';

import { backoff } from './backoff';
import type { PrecisionTimer } from './precision-timer';
import type { TaskHandlerRegistry } from './task-handler';
import type { ClaimedTask } from '../core/types';
import { entityToClaimedTask } from '../storage/mappers';

type ClaimedEntry = { host: string; task: ClaimedTask };

/**
 * Claims due tasks, fires each at its `runAt`, dispatches to the handler registered
 * for its `taskType`, and records the outcome. Runs on every main; the claim's
 * locking guarantees each task is owned by one instance. A driver calls
 * {@link claimAndSchedule} on a cadence with the host id; reclaiming expired leases
 * is a separate concern (the reaper).
 *
 * Guarded transitions match the task's lease epoch, so an owner that stalled and was
 * reclaimed can't write over the reclaimed run. No reclaim happens until the reaper
 * exists, so the epoch guard is inert until then.
 */
export class Executor {
	private readonly leaseMs: number;

	private readonly lookaheadMs: number;

	private readonly batchSize: number;

	private readonly logger: Logger;

	/**
	 * Claimed and scheduled but not yet fired, keyed by task id. Held so {@link stop}
	 * can release them on shutdown; dropped the instant a task's timer fires (then
	 * in-flight, not ours to release).
	 */
	private readonly claimed = new Map<string, ClaimedEntry>();

	constructor(
		private readonly taskRepository: ScheduledTaskRepository,
		private readonly registry: TaskHandlerRegistry,
		private readonly timer: PrecisionTimer,
		logger: Logger,
		config: SchedulerConfig,
	) {
		this.logger = logger.scoped('scheduler');
		this.leaseMs = config.leaseDurationSeconds * Time.seconds.toMilliseconds;
		// Claim one interval ahead so a task due before the next tick fires precisely on
		// the timer, at the cost of holding its claim until then.
		this.lookaheadMs = config.executorIntervalSeconds * Time.seconds.toMilliseconds;
		this.batchSize = config.claimBatchSize;
	}

	/**
	 * One tick: claim the due tasks this instance can run and schedule each to fire at
	 * its `runAt`. Returns the claimed tasks (for tests/observability). Only the claim
	 * is atomic; the per-row scheduling and any release are independent writes.
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
				await this.releaseUnmappableRow(host, row, error);
				continue;
			}

			tasks.push(task);
			// Track before scheduling so a shutdown before it fires still releases it.
			this.claimed.set(task.id, { host, task });
			this.timer.schedule(task.runAt, () => {
				// Drop before firing: once firing it's in-flight, not stop()'s to release.
				this.claimed.delete(task.id);
				// Detached from the timer: swallow a mid-fire rejection so it isn't an
				// unhandled rejection. The row stays `running` for the reaper.
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
		const claim: ClaimRef = { host, id: task.id, claimedEpoch: task.leaseEpoch };
		// Guard + set `startedAt` in one write. 0 rows => deleted or reclaimed; don't
		// dispatch an execution for work that is gone or no longer ours.
		const started = await this.taskRepository.markStarted(claim);
		if (started === 0) return;

		const handler = this.registry.resolve(task.taskType);
		// The claim is scoped to registered types, so this normally resolves. If the
		// handler went away (e.g. a rolling restart), release without counting an attempt
		// so the occurrence isn't lost.
		if (handler === undefined) {
			this.logger.warn('Scheduler executor found no handler for claimed task; releasing it', {
				taskId: task.id,
				taskType: task.taskType,
			});
			await this.taskRepository.releaseClaim(claim);
			return;
		}

		// Record success only after the try, so a failure to record it isn't taken for a
		// handler failure. Such a failure propagates out (caught by the detached `.catch`
		// in claimAndSchedule) and leaves the row `running` for the reaper.
		try {
			await handler.execute(task);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const nextAttempts = task.attempts + 1;
			if (nextAttempts >= task.maxAttempts) {
				await this.taskRepository.failTaskTerminal(claim, message);
			} else {
				await this.taskRepository.rescheduleTask(claim, backoff(nextAttempts), message);
			}
			return;
		}

		await this.taskRepository.completeTask(claim);
	}

	/**
	 * A corrupt claimed row must not abort scheduling for the rest of the batch.
	 * Release it (best effort) so it returns to pending rather than staying stranded
	 * `running` until the reaper.
	 */
	private async releaseUnmappableRow(
		host: string,
		row: ScheduledTask,
		error: unknown,
	): Promise<void> {
		this.logger.error('Scheduler executor could not map claimed task; releasing it', {
			taskId: row.id,
			error,
		});
		try {
			await this.taskRepository.releaseClaim({ host, id: row.id, claimedEpoch: row.leaseEpoch });
		} catch {
			// Best effort: the reaper still recovers the row if the release fails.
		}
	}

	/**
	 * Cancel scheduled-but-unfired timers and release their claims (shutdown); without
	 * the release they stay `running`+leased until the reaper reclaims them.
	 *
	 * Driver contract: stop calling {@link claimAndSchedule} before this. There is no
	 * in-flight guard, so a concurrent tick could schedule timers after `cancelAll`
	 * whose entries `claimed.clear()` drops, leaving them to fire post-stop. A tick and
	 * stop must not overlap.
	 */
	async stop(): Promise<void> {
		this.timer.cancelAll();

		const entries = [...this.claimed.values()];
		const results = await Promise.allSettled(
			entries.map(
				async ({ host, task }) =>
					await this.taskRepository.releaseClaim({
						host,
						id: task.id,
						claimedEpoch: task.leaseEpoch,
					}),
			),
		);
		// allSettled preserves input order, so results line up with entries by index.
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				this.logger.error('Scheduler executor failed to release claim on shutdown', {
					taskId: entries[index].task.id,
					error: result.reason,
				});
			}
		});
		this.claimed.clear();
	}
}
