import { ExecutionsConfig } from '@n8n/config';
import { BinaryDataService, InstanceSettings } from 'n8n-core';
import { ensureError } from 'n8n-workflow';
import { strict } from 'node:assert';
import { Service } from 'typedi';

import { Time } from '@/constants';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { connectionState as dbConnectionState } from '@/db';
import { OnShutdown } from '@/decorators/on-shutdown';
import { Logger } from '@/logging/logger.service';

import { OrchestrationService } from '../orchestration.service';

/**
 * Responsible for pruning executions from the database and their associated binary data
 * from the filesystem, on a rolling basis. By default we soft-delete execution rows
 * every cycle and hard-delete them and their binary data every 4th cycle.
 */
@Service()
export class PruningService {
	/** Timer for soft-deleting executions on a rolling basis. */
	private softDeletionInterval: NodeJS.Timer | undefined;

	/** Timeout for next hard-deletion of soft-deleted executions. */
	private hardDeletionTimeout: NodeJS.Timeout | undefined;

	private readonly rates = {
		softDeletion: this.executionsConfig.pruneDataIntervals.softDelete * Time.minutes.toMilliseconds,
		hardDeletion: this.executionsConfig.pruneDataIntervals.hardDelete * Time.minutes.toMilliseconds,
	};

	/** Max number of executions to hard-delete in a cycle. */
	private readonly batchSize = 100;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionRepository: ExecutionRepository,
		private readonly binaryDataService: BinaryDataService,
		private readonly orchestrationService: OrchestrationService,
		private readonly executionsConfig: ExecutionsConfig,
	) {
		this.logger = this.logger.scoped('pruning');
	}

	init() {
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		if (this.instanceSettings.isLeader) this.startPruning();

		if (this.instanceSettings.isMultiMain) {
			this.orchestrationService.multiMainSetup.on('leader-takeover', () => this.startPruning());
			this.orchestrationService.multiMainSetup.on('leader-stepdown', () => this.stopPruning());
		}
	}

	get isEnabled() {
		return (
			this.executionsConfig.pruneData &&
			this.instanceSettings.instanceType === 'main' &&
			this.instanceSettings.isLeader
		);
	}

	startPruning() {
		if (!this.isEnabled || !dbConnectionState.migrated || this.isShuttingDown) return;

		this.scheduleRollingSoftDeletions();
		this.scheduleNextHardDeletion();
	}

	stopPruning() {
		if (!this.isEnabled) return;

		clearInterval(this.softDeletionInterval);
		clearTimeout(this.hardDeletionTimeout);
	}

	private scheduleRollingSoftDeletions(rateMs = this.rates.softDeletion) {
		this.softDeletionInterval = setInterval(
			async () => await this.softDelete(),
			this.rates.softDeletion,
		);

		this.logger.debug(`Soft-deletion every ${rateMs * Time.milliseconds.toMinutes} minutes`);
	}

	private scheduleNextHardDeletion(rateMs = this.rates.hardDeletion) {
		this.hardDeletionTimeout = setTimeout(() => {
			this.hardDelete()
				.then((rate) => this.scheduleNextHardDeletion(rate))
				.catch((error) => {
					this.scheduleNextHardDeletion(1_000);
					this.logger.error('Failed to hard-delete executions', { error: ensureError(error) });
				});
		}, rateMs);

		this.logger.debug(`Hard-deletion in next ${rateMs * Time.milliseconds.toMinutes} minutes`);
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

	@OnShutdown()
	shutdown(): void {
		this.isShuttingDown = true;
		this.stopPruning();
	}

	/**
	 * Delete all soft-deleted executions and their binary data.
	 *
	 * @returns Delay in milliseconds until next hard-deletion
	 */
	private async hardDelete(): Promise<number> {
		const ids = await this.executionRepository.findSoftDeletedExecutions();

		const executionIds = ids.map((o) => o.executionId);

		if (executionIds.length === 0) {
			this.logger.debug('Found no executions to hard-delete');

			return this.rates.hardDeletion;
		}

		try {
			await this.binaryDataService.deleteMany(ids);

			await this.executionRepository.deleteByIds(executionIds);

			this.logger.debug('Hard-deleted executions', { executionIds });
		} catch (error) {
			this.logger.error('Failed to hard-delete executions', {
				executionIds,
				error: ensureError(error),
			});
		}

		// if high volume, speed up next hard-deletion
		if (executionIds.length >= this.batchSize) return 1 * Time.seconds.toMilliseconds;

		return this.rates.hardDeletion;
	}
}
