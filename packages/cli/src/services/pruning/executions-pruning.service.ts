import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { ErrorReporter } from 'n8n-core';

import { ExecutionPersistence } from '@/executions/execution-persistence';

type SoftDeletedRef = Awaited<ReturnType<ExecutionRepository['findSoftDeletedExecutions']>>[number];

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
		private readonly errorReporter: ErrorReporter,
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
			if (signal.aborted) break;
			deletedCount += await this.hardDeleteBatch(refs, signal);

			if (refs.length < this.executionRepository.hardDeletionBatchSize) break;

			await this.waitBetweenBatches(signal);
		}

		this.logger.debug('Hard-deleted executions', { count: deletedCount });
	}

	/** Falls back to single deletes when the batch fails, and rethrows when none of them succeeds. */
	private async hardDeleteBatch(refs: SoftDeletedRef[], signal: AbortSignal): Promise<number> {
		try {
			await this.executionPersistence.hardDelete(refs);
			return refs.length;
		} catch (batchError) {
			const deleted = await this.hardDeleteOneByOne(refs, signal);
			if (deleted === 0) throw batchError;
			return deleted;
		}
	}

	/** Reports each failed row to Sentry and logs their ids once. Stops when the signal aborts. */
	private async hardDeleteOneByOne(refs: SoftDeletedRef[], signal: AbortSignal): Promise<number> {
		const failedIds: string[] = [];
		let deleted = 0;
		for (const ref of refs) {
			if (signal.aborted) break;
			try {
				await this.executionPersistence.hardDelete(ref);
				deleted++;
			} catch (error) {
				failedIds.push(ref.executionId);
				this.errorReporter.error(error, {
					extra: { executionId: ref.executionId },
					shouldBeLogged: false,
					shouldIsolate: true,
				});
			}
		}
		if (failedIds.length > 0) {
			this.logger.error('Failed to hard-delete executions', { executionIds: failedIds });
		}
		return deleted;
	}

	private async waitBetweenBatches(signal: AbortSignal): Promise<void> {
		try {
			await sleep(BATCH_DELAY_MS, signal);
		} catch {
			// `sleep` rejects only on abort, which the loop checks for on its own.
		}
	}
}
