import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';

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

	/**
	 * Delete soft-deleted executions in batches until one comes back short or the signal aborts.
	 * The run walks the backlog from the newest id down, so a row that fails is not selected again.
	 */
	async hardDelete(signal: AbortSignal): Promise<void> {
		const { hardDeletionBatchSize } = this.executionRepository;
		let before: string | undefined;
		let deletedCount = 0;
		let hasMore = true;

		while (hasMore && !signal.aborted) {
			const refs = await this.executionRepository.findSoftDeletedExecutions(before);
			if (!signal.aborted) {
				deletedCount += await this.hardDeleteBatch(refs, signal);
			}
			hasMore = refs.length === hardDeletionBatchSize;
			if (hasMore) {
				before = refs.at(-1)?.executionId;
				await this.waitBetweenBatches(signal);
			}
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

	/** Logs the ids that failed once per batch. Stops when the signal aborts. */
	private async hardDeleteOneByOne(refs: SoftDeletedRef[], signal: AbortSignal): Promise<number> {
		const failedInBatch: string[] = [];
		let deleted = 0;
		for (const ref of refs) {
			if (signal.aborted) break;
			try {
				await this.executionPersistence.hardDelete(ref);
				deleted++;
			} catch {
				failedInBatch.push(ref.executionId);
			}
		}
		if (failedInBatch.length > 0) {
			this.logger.error('Failed to hard-delete executions', { executionIds: failedInBatch });
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
