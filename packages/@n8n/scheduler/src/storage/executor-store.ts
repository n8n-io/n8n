import { Logger } from '@n8n/backend-common';
import { ScheduledTaskRepository, type ScheduledTask as ScheduledTaskEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { entityToClaimedTask } from './mappers';
import type { ClaimDueTasksBatch, ClaimedTask, ClaimedTaskRef, ExecutorTaskStore } from '../core';

/**
 * The database-backed {@link ExecutorTaskStore}: the executor's claim and
 * terminal-transition writes, delegated to `ScheduledTaskRepository`. This is
 * the only seam between the executor and the database; the entity-to-domain
 * mapping happens here so the executor never sees a raw row.
 */
@Service()
export class ExecutorStore implements ExecutorTaskStore {
	private readonly logger: Logger;

	constructor(
		private readonly tasks: ScheduledTaskRepository,
		logger: Logger,
	) {
		this.logger = logger.scoped('scheduler');
	}

	async claimDueTasks(batch: ClaimDueTasksBatch): Promise<ClaimedTask[]> {
		const rows = await this.tasks.claimDueTasks(batch);
		const claimed: ClaimedTask[] = [];
		for (const row of rows) {
			try {
				claimed.push(entityToClaimedTask(row));
			} catch (error) {
				// A corrupt claimed row must not abort the claim for the rest of the batch.
				// Release it so it returns to pending rather than staying stranded `running`.
				await this.releaseUnmappableRow(batch.host, row, error);
			}
		}
		return claimed;
	}

	async markStarted(claim: ClaimedTaskRef): Promise<number> {
		return await this.tasks.markStarted(claim);
	}

	async completeTask(claim: ClaimedTaskRef): Promise<number> {
		return await this.tasks.completeTask(claim);
	}

	async failTaskTerminal(claim: ClaimedTaskRef, errorMessage: string): Promise<number> {
		return await this.tasks.failTaskTerminal(claim, errorMessage);
	}

	async rescheduleTask(
		claim: ClaimedTaskRef,
		backoffMs: number,
		errorMessage: string,
	): Promise<number> {
		return await this.tasks.rescheduleTask(claim, backoffMs, errorMessage);
	}

	async releaseClaim(claim: ClaimedTaskRef): Promise<number> {
		return await this.tasks.releaseClaim(claim);
	}

	private async releaseUnmappableRow(
		host: string,
		row: ScheduledTaskEntity,
		error: unknown,
	): Promise<void> {
		this.logger.error('Scheduler executor store could not map claimed task; releasing it', {
			taskId: row.id,
			error,
		});
		// Best-effort: the reaper still recovers the row if the release itself fails.
		try {
			await this.tasks.releaseClaim({ host, id: row.id, claimedEpoch: row.leaseEpoch });
		} catch (releaseError) {
			this.logger.error('Scheduler executor store failed to release claim', {
				taskId: row.id,
				error: releaseError,
			});
		}
	}
}
