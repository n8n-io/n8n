import Container, { Service } from 'typedi';
import { BinaryDataService } from 'n8n-core';
import { LessThanOrEqual, IsNull, Not, In, Brackets } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import type { FindOptionsWhere } from 'typeorm';

import { TIME, inTest } from '@/constants';
import config from '@/config';
import { ExecutionRepository } from '@/databases/repositories';
import { Logger } from '@/Logger';
import { ExecutionEntity } from '@/databases/entities/ExecutionEntity';

@Service()
export class PruningService {
	private hardDeletionBatchSize = 100;

	private rates: Record<string, number> = {
		softDeletion: config.getEnv('executions.pruneDataIntervals.softDelete') * TIME.MINUTE,
		hardDeletion: config.getEnv('executions.pruneDataIntervals.hardDelete') * TIME.MINUTE,
	};

	public softDeletionInterval: NodeJS.Timer | undefined;

	public hardDeletionTimeout: NodeJS.Timeout | undefined;

	private isMultiMainScenario =
		config.getEnv('executions.mode') === 'queue' && config.getEnv('leaderSelection.enabled');

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly binaryDataService: BinaryDataService,
	) {}

	async isPruningEnabled() {
		if (
			!config.getEnv('executions.pruneData') ||
			inTest ||
			config.get('generic.instanceType') !== 'main'
		) {
			return false;
		}

		if (this.isMultiMainScenario) {
			const { MultiMainInstancePublisher } = await import(
				'@/services/orchestration/main/MultiMainInstance.publisher.ee'
			);

			const multiMainInstancePublisher = Container.get(MultiMainInstancePublisher);

			await multiMainInstancePublisher.init();

			return multiMainInstancePublisher.isLeader;
		}

		return true;
	}

	startPruning() {
		this.setSoftDeletionInterval();
		this.scheduleHardDeletion();
	}

	async stopPruning() {
		if (this.isMultiMainScenario) {
			const { MultiMainInstancePublisher } = await import(
				'@/services/orchestration/main/MultiMainInstance.publisher.ee'
			);

			const multiMainInstancePublisher = Container.get(MultiMainInstancePublisher);

			await multiMainInstancePublisher.init();

			if (multiMainInstancePublisher.isFollower) return;
		}

		this.logger.debug('Clearing soft-deletion interval and hard-deletion timeout (pruning cycle)');

		clearInterval(this.softDeletionInterval);
		clearTimeout(this.hardDeletionTimeout);
	}

	private setSoftDeletionInterval(rateMs = this.rates.softDeletion) {
		const when = [(rateMs / TIME.MINUTE).toFixed(2), 'min'].join(' ');

		this.logger.debug(`Setting soft-deletion interval at every ${when} (pruning cycle)`);

		this.softDeletionInterval = setInterval(
			async () => this.softDeleteOnPruningCycle(),
			this.rates.softDeletion,
		);
	}

	private scheduleHardDeletion(rateMs = this.rates.hardDeletion) {
		const when = [(rateMs / TIME.MINUTE).toFixed(2), 'min'].join(' ');

		this.logger.debug(`Scheduling hard-deletion for next ${when} (pruning cycle)`);

		this.hardDeletionTimeout = setTimeout(
			async () => this.hardDeleteOnPruningCycle(),
			this.rates.hardDeletion,
		);
	}

	/**
	 * Mark executions as deleted based on age and count, in a pruning cycle.
	 */
	async softDeleteOnPruningCycle() {
		this.logger.debug('Starting soft-deletion of executions (pruning cycle)');

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
			this.logger.debug('Found no executions to soft-delete (pruning cycle)');
		}
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
			this.logger.debug('Found no executions to hard-delete (pruning cycle)');
			this.scheduleHardDeletion();
			return;
		}

		try {
			this.logger.debug('Starting hard-deletion of executions (pruning cycle)', {
				executionIds,
			});

			await this.binaryDataService.deleteMany(workflowIdsAndExecutionIds);

			await this.executionRepository.delete({ id: In(executionIds) });
		} catch (error) {
			this.logger.error('Failed to hard-delete executions (pruning cycle)', {
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
