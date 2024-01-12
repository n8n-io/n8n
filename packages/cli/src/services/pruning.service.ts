import { Service } from 'typedi';
import { BinaryDataService, DisallowedFilepathError } from 'n8n-core';
import { inTest, TIME } from '@/constants';
import config from '@/config';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { Logger } from '@/Logger';
import { jsonStringify } from 'n8n-workflow';
import { OnShutdown } from '@/decorators/OnShutdown';
import fs from 'node:fs/promises';
import path from 'node:path';

@Service()
export class PruningService {
	private hardDeletionBatchSize = 100;

	private rates: Record<string, number> = {
		softDeletion: config.getEnv('executions.pruneDataIntervals.softDelete') * TIME.MINUTE,
		hardDeletion: config.getEnv('executions.pruneDataIntervals.hardDelete') * TIME.MINUTE,
	};

	public softDeletionInterval: NodeJS.Timer | undefined;

	public hardDeletionTimeout: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly binaryDataService: BinaryDataService,
	) {}

	isPruningEnabled() {
		if (
			!config.getEnv('executions.pruneData') ||
			inTest ||
			config.get('generic.instanceType') !== 'main'
		) {
			return false;
		}

		if (
			config.getEnv('multiMainSetup.enabled') &&
			config.getEnv('generic.instanceType') === 'main' &&
			config.getEnv('multiMainSetup.instanceType') === 'follower'
		) {
			return false;
		}

		return true;
	}

	/**
	 * @important Call this method only after DB migrations have completed.
	 */
	startPruning() {
		if (this.isShuttingDown) {
			this.logger.warn('[Pruning] Cannot start pruning while shutting down');
			return;
		}

		this.logger.debug('[Pruning] Starting soft-deletion and hard-deletion timers');

		this.setSoftDeletionInterval();
		this.scheduleHardDeletion();
	}

	stopPruning() {
		this.logger.debug('[Pruning] Removing soft-deletion and hard-deletion timers');

		clearInterval(this.softDeletionInterval);
		clearTimeout(this.hardDeletionTimeout);
	}

	private setSoftDeletionInterval(rateMs = this.rates.softDeletion) {
		const when = [rateMs / TIME.MINUTE, 'min'].join(' ');

		this.softDeletionInterval = setInterval(
			async () => this.softDeleteOnPruningCycle(),
			this.rates.softDeletion,
		);

		this.logger.debug(`[Pruning] Soft-deletion scheduled every ${when}`);
	}

	private scheduleHardDeletion(rateMs = this.rates.hardDeletion) {
		const when = [rateMs / TIME.MINUTE, 'min'].join(' ');

		this.hardDeletionTimeout = setTimeout(() => {
			this.hardDeleteOnPruningCycle()
				.then((rate) => this.scheduleHardDeletion(rate))
				.catch((error) => {
					this.scheduleHardDeletion(1 * TIME.SECOND);

					const errorMessage =
						error instanceof Error
							? error.message
							: jsonStringify(error, { replaceCircularRefs: true });

					this.logger.error('[Pruning] Failed to hard-delete executions', { errorMessage });
				});
		}, rateMs);

		this.logger.debug(`[Pruning] Hard-deletion scheduled for next ${when}`);
	}

	/**
	 * Mark executions as deleted based on age and count, in a pruning cycle.
	 */
	async softDeleteOnPruningCycle() {
		this.logger.debug('[Pruning] Starting soft-deletion of executions');

		const result = await this.executionRepository.softDeletePrunableExecutions();

		if (result.affected === 0) {
			this.logger.debug('[Pruning] Found no executions to soft-delete');
			return;
		}

		this.logger.debug('[Pruning] Soft-deleted executions', { count: result.affected });
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		this.stopPruning();
	}

	/**
	 * Remove all data associated with an execution and stored outside the DB.
	 * Currently, this affects only binary data in filesystem mode.
	 */
	async deleteExternalData(ids: Array<{ workflowId: string; executionId: string }>) {
		if (ids.length === 0) return;

		if (config.getEnv('binaryDataManager.mode') !== 'filesystem') return;

		const storagePath = config.getEnv('binaryDataManager').localStoragePath;

		// binary files stored separate in nested dirs - `filesystem-v2`

		await Promise.all(
			ids.map(async ({ workflowId, executionId }) => {
				const nestedPath = `workflows/${workflowId}/executions/${executionId}`;
				const dir = path.join(storagePath, nestedPath);

				if (path.relative(storagePath, dir).startsWith('..')) {
					throw new DisallowedFilepathError(dir);
				}

				await fs.rm(dir, { recursive: true, force: true });
			}),
		);

		// binary files stored flat in single dir - `filesystem` (legacy)

		const executionIds = ids.map((o) => o.executionId);

		const set = new Set(executionIds);

		let fileNames: string[] = [];
		try {
			fileNames = await fs.readdir(storagePath);
		} catch {
			return; // no such dir
		}

		const EXECUTION_ID_EXTRACTOR =
			/^(\w+)(?:[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})$/;

		for (const fileName of fileNames) {
			const executionId = fileName.match(EXECUTION_ID_EXTRACTOR)?.[1];

			if (executionId && set.has(executionId)) {
				const filePath = path.join(storagePath, fileName);

				if (path.relative(storagePath, filePath).startsWith('..')) {
					throw new DisallowedFilepathError(filePath);
				}

				await Promise.all([
					fs.rm(filePath, { force: true }),
					fs.rm(`${filePath}.metadata`, { force: true }),
				]);
			}
		}
	}

	/**
	 * Permanently remove all soft-deleted executions and their associated data, in a pruning cycle.
	 * @return Delay in ms after which the next cycle should be started
	 */
	private async hardDeleteOnPruningCycle() {
		const ids = await this.executionRepository.hardDeleteSoftDeletedExecutions();

		const executionIds = ids.map((o) => o.executionId);

		if (executionIds.length === 0) {
			this.logger.debug('[Pruning] Found no executions to hard-delete');

			return this.rates.hardDeletion;
		}

		try {
			this.logger.debug('[Pruning] Starting hard-deletion of executions', { executionIds });

			await this.deleteExternalData(ids);

			await this.executionRepository.deleteByIds(executionIds);

			this.logger.debug('[Pruning] Hard-deleted executions', { executionIds });
		} catch (error) {
			this.logger.error('[Pruning] Failed to hard-delete executions', {
				executionIds,
				error: error instanceof Error ? error.message : `${error}`,
			});
		}

		/**
		 * For next batch, speed up hard-deletion cycle in high-volume case
		 * to prevent high concurrency from causing duplicate deletions.
		 */
		const isHighVolume = executionIds.length >= this.hardDeletionBatchSize;

		return isHighVolume ? 1 * TIME.SECOND : this.rates.hardDeletion;
	}
}
