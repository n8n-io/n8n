import { Service } from 'typedi';
import { BinaryDataService } from 'n8n-core';
import { LessThanOrEqual, IsNull, Not, In, Brackets } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import type { FindOptionsWhere } from 'typeorm';

import { TIME, inTest } from '@/constants';
import config from '@/config';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { Logger } from '@/Logger';
import { ExecutionEntity } from '@db/entities/ExecutionEntity';

@Service()
export class PruningService {
	private hardDeletionBatchSize = 100;

	private rates: Record<string, number> = {
		softDeletion: config.getEnv('executions.pruneDataIntervals.softDelete') * TIME.MINUTE,
		hardDeletion: config.getEnv('executions.pruneDataIntervals.hardDelete') * TIME.MINUTE,
	};

	public softDeletionInterval: NodeJS.Timer | undefined;

	public hardDeletionTimeout: NodeJS.Timeout | undefined;

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

		this.hardDeletionTimeout = setTimeout(
			async () => this.hardDeleteOnPruningCycle(),
			this.rates.hardDeletion,
		);

		this.logger.debug(`[Pruning] Hard-deletion scheduled for next ${when}`);
	}

	/**
	 * Mark executions as deleted based on age and count, in a pruning cycle.
	 */
	async softDeleteOnPruningCycle() {
		this.logger.debug('[Pruning] Starting soft-deletion of executions');

		const maxAge = config.getEnv('executions.pruneDataMaxAge'); // in h
		const maxCount = config.getEnv('executions.pruneDataMaxCount');

		// Find ids of all executions that were stopped longer that pruneDataMaxAge ago
		const date = new Date();
		date.setHours(date.getHours() - maxAge);

		const toPrune: Array<FindOptionsWhere<ExecutionEntity>> = [
			// date reformatting needed - see https://github.com/typeorm/typeorm/issues/2286
			{ stoppedAt: LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(date)) },
		];

		if (maxCount > 0) {
			const executions = await this.executionRepository.find({
				select: ['id'],
				skip: maxCount,
				take: 1,
				order: { id: 'DESC' },
			});

			if (executions[0]) {
				toPrune.push({ id: LessThanOrEqual(executions[0].id) });
			}
		}

		const [timeBasedWhere, countBasedWhere] = toPrune;

		const result = await this.executionRepository
			.createQueryBuilder()
			.update(ExecutionEntity)
			.set({ deletedAt: new Date() })
			.where({
				deletedAt: IsNull(),
				// Only mark executions as deleted if they are in an end state
				status: Not(In(['new', 'running', 'waiting'])),
			})
			.andWhere(
				new Brackets((qb) =>
					countBasedWhere
						? qb.where(timeBasedWhere).orWhere(countBasedWhere)
						: qb.where(timeBasedWhere),
				),
			)
			.execute();

		if (result.affected === 0) {
			this.logger.debug('[Pruning] Found no executions to soft-delete');
			return;
		}

		this.logger.debug('[Pruning] Soft-deleted executions', { count: result.affected });
	}

	/**
	 * Permanently remove all soft-deleted executions and their binary data, in a pruning cycle.
	 */
	private async hardDeleteOnPruningCycle() {
		const date = new Date();
		date.setHours(date.getHours() - config.getEnv('executions.pruneDataHardDeleteBuffer'));

		const workflowIdsAndExecutionIds = (
			await this.executionRepository.find({
				select: ['workflowId', 'id'],
				where: {
					deletedAt: LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(date)),
				},
				take: this.hardDeletionBatchSize,

				/**
				 * @important This ensures soft-deleted executions are included,
				 * else `@DeleteDateColumn()` at `deletedAt` will exclude them.
				 */
				withDeleted: true,
			})
		).map(({ id: executionId, workflowId }) => ({ workflowId, executionId }));

		const executionIds = workflowIdsAndExecutionIds.map((o) => o.executionId);

		if (executionIds.length === 0) {
			this.logger.debug('[Pruning] Found no executions to hard-delete');
			this.scheduleHardDeletion();
			return;
		}

		try {
			this.logger.debug('[Pruning] Starting hard-deletion of executions', {
				executionIds,
			});

			await this.binaryDataService.deleteMany(workflowIdsAndExecutionIds);

			await this.executionRepository.delete({ id: In(executionIds) });

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
		const rate = isHighVolume ? 1 * TIME.SECOND : this.rates.hardDeletion;

		this.scheduleHardDeletion(rate);
	}
}
