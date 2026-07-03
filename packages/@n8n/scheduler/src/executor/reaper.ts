import { Logger } from '@n8n/backend-common';
import { SchedulerConfig } from '@n8n/config';
import { ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { backoff } from './backoff';

/** Recorded on a task the reaper recovers, so the failure has a cause. */
const LEASE_EXPIRED_MESSAGE = 'Lease expired before completion';

/** Outcome of one sweep, for observability and tests. */
export interface ReapResult {
	/** Tasks returned to `pending` for another attempt. */
	reclaimed: number;
	/** Tasks failed terminally (no attempts left). */
	deadLettered: number;
}

/**
 * Recovers tasks stranded `running` by an instance that crashed or stalled past
 * its lease. Runs on every main; a driver (the multi-main loop, a later ticket)
 * calls {@link reap} on a cadence.
 *
 * The sweep reads expired-lease rows and decides per row, reusing the shared
 * {@link backoff} curve so a lease-expiry retry waits exactly as long as a
 * handler-failure retry would. Reclaim returns the row to `pending`; a stalled
 * original owner is fenced first by the `status = 'running'` guard (while the row
 * is `pending`) and then by the epoch, which the next claim bumps. The reclaim also
 * bumps the epoch itself, but that is defence in depth (a monotonic epoch on every
 * ownership transition, and a fence against a second concurrent reaper), not what
 * closes the stalled-owner window (see {@link Executor}).
 *
 * Each per-row update is guarded and 0 rows affected is benign, so concurrent
 * reapers on every main are safe. A row that throws is skipped, not allowed to
 * abort the rest of the pass.
 */
@Service()
export class Reaper {
	private readonly batchSize: number;

	constructor(
		private readonly taskRepository: ScheduledTaskRepository,
		private readonly logger: Logger,
		config: SchedulerConfig,
	) {
		this.batchSize = config.reaperBatchSize;
	}

	/**
	 * One reaper pass: reclaim (or dead-letter) up to `batchSize` expired-lease
	 * tasks. A task with attempts left goes back to `pending` with a backoff and a
	 * bumped epoch; one at its last attempt fails terminally. Returns the counts.
	 */
	async reap(): Promise<ReapResult> {
		const expired = await this.taskRepository.findExpiredLeases(this.batchSize);
		if (expired.length === 0) return { reclaimed: 0, deadLettered: 0 };

		let reclaimed = 0;
		let deadLettered = 0;
		for (const task of expired) {
			// One row that keeps throwing must not abort the pass: it sorts oldest-first,
			// so it would head-of-line block every younger expired row on each sweep.
			// Skip it (best effort) and let a later pass retry it.
			try {
				// The expired lease means the in-flight attempt is lost; count it now, same
				// as a handler failure would, and decide retry vs terminal on that number.
				const nextAttempts = task.attempts + 1;
				if (nextAttempts >= task.maxAttempts) {
					deadLettered += await this.taskRepository.deadLetterExpired(
						{ id: task.id, claimedEpoch: task.leaseEpoch },
						LEASE_EXPIRED_MESSAGE,
					);
				} else {
					reclaimed += await this.taskRepository.reclaimExpired(
						{ id: task.id, claimedEpoch: task.leaseEpoch },
						backoff(nextAttempts),
						LEASE_EXPIRED_MESSAGE,
					);
				}
			} catch (error) {
				this.logger.error('Scheduler reaper failed to recover an expired-lease task', {
					taskId: task.id,
					error,
				});
			}
		}

		if (reclaimed > 0 || deadLettered > 0) {
			this.logger.info('Scheduler reaper recovered expired-lease tasks', {
				reclaimed,
				deadLettered,
			});
		}
		return { reclaimed, deadLettered };
	}
}
