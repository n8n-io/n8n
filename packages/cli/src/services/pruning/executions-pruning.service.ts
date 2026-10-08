import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';

import { ExecutionPersistence } from '@/executions/execution-persistence';

/** Pause between full batches, i.e. while backlog remains. */
const BATCH_DELAY_MS = 1000;

/**
 * Responsible for deleting old executions from the database and deleting their
 * associated binary data from the filesystem, on a rolling basis.
 *
 * - Soft deletion (`execution-pruning-soft-delete` system task) identifies all
 *   prunable executions based on max age and/or max count, exempting annotated
 *   executions.
 * - Hard deletion (`execution-pruning-hard-delete` system task) removes the
 *   soft-deleted executions in batches of 100 until the backlog is drained.
 */
@Service()
export class ExecutionsPruningService {
	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
	) {
		this.logger = this.logger.scoped('pruning');
	}

	/** Soft-delete executions based on max age and/or max count. */
	async softDelete() {
		const result = await this.executionRepository.softDeletePrunableExecutions();

		if (result.affected === 0) {
			this.logger.debug('Found no executions to soft-delete');
			return;
		}

		this.logger.debug('Soft-deleted executions', { count: result.affected });
	}

	/** Delete soft-deleted executions in batches until one comes back short or the signal aborts. */
	async hardDelete(signal: AbortSignal): Promise<void> {
		let deletedCount = 0;

		while (!signal.aborted) {
			const refs = await this.executionRepository.findSoftDeletedExecutions();
			await this.executionPersistence.hardDelete(refs);
			deletedCount += refs.length;

			if (refs.length < this.executionRepository.hardDeletionBatchSize) break;

			await this.waitBetweenBatches(signal);
		}

		this.logger.debug('Hard-deleted executions', { count: deletedCount });
	}

	private async waitBetweenBatches(signal: AbortSignal): Promise<void> {
		try {
			await sleep(BATCH_DELAY_MS, signal);
		} catch {
			// `sleep` rejects only on abort, which the loop checks for on its own.
		}
	}
}
