import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection, DbLock, DbLockService, WorkflowStatisticsRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import { strict } from 'node:assert';

import { WorkflowStatisticsService } from './workflow-statistics.service';

type RollupResult = Awaited<ReturnType<WorkflowStatisticsRepository['rollupIncrements']>>;

const BATCH_SIZE = 5000;

/** Steady cadence once the backlog is drained. */
const STEADY_INTERVAL_MS = 5 * Time.seconds.toMilliseconds;

/** Fast cadence while a batch comes back full, i.e. backlog remaining. */
const BUSY_INTERVAL_MS = 250;

/**
 * Folds statistics increments in the `workflow_statistics_delta` table
 * into the `workflow_statistics` table.
 */
@Service()
export class WorkflowStatisticsRollupService {
	private timeout: NodeJS.Timeout | undefined;

	private isActive = false;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly dbConnection: DbConnection,
		private readonly globalConfig: GlobalConfig,
		private readonly dbLockService: DbLockService,
		private readonly repository: WorkflowStatisticsRepository,
		private readonly statisticsService: WorkflowStatisticsService,
	) {}

	get shouldRun() {
		return (
			this.globalConfig.database.type === 'postgresdb' &&
			this.dbConnection.connectionState.migrated &&
			this.instanceSettings.instanceType === 'main' &&
			this.instanceSettings.isLeader &&
			!this.isShuttingDown
		);
	}

	init() {
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		if (this.shouldRun) this.start();
	}

	@OnLeaderTakeover()
	start() {
		if (!this.shouldRun || this.isActive) return;

		this.isActive = true;
		this.scheduleNext(0);
		this.logger.debug('Workflow statistics rollup interval started');
	}

	@OnLeaderStepdown()
	stop() {
		this.isActive = false;
		clearTimeout(this.timeout);
		this.timeout = undefined;
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		this.isActive = false;
		clearTimeout(this.timeout);
		this.timeout = undefined;
	}

	private scheduleNext(delayMs: number) {
		if (!this.isActive) return;

		this.timeout = setTimeout(() => {
			void this.rollup()
				.then((deltaRows) => {
					if (!this.isActive) return;
					const newDelayMs = deltaRows >= BATCH_SIZE ? BUSY_INTERVAL_MS : STEADY_INTERVAL_MS;
					this.scheduleNext(newDelayMs);
				})
				.catch((error) => {
					this.logger.error('Workflow statistics rollup failed', { error: ensureError(error) });
					if (!this.isActive) return;
					this.scheduleNext(STEADY_INTERVAL_MS);
				});
		}, delayMs);
	}

	/** Fold a batch of increments under an advisory lock. Returns increment rows folded. */
	private async rollup(): Promise<number> {
		let result: RollupResult;

		try {
			result = await this.dbLockService.tryWithLock(
				DbLock.WORKFLOW_STATISTICS_ROLLUP,
				async (tx) => await this.repository.rollupIncrements(tx, BATCH_SIZE),
			);
		} catch (error) {
			if (error instanceof OperationalError) return 0; // another instance held the lock, skip this tick
			throw error;
		}

		for (const fo of result.firstOccurrences) {
			try {
				await this.statisticsService.emitFirstOccurrenceEvent(
					fo.name,
					fo.workflowId,
					fo.workflowName,
					fo.firstEventMs,
				);
			} catch (error) {
				this.logger.debug('Failed to emit workflow statistics milestone', {
					error: ensureError(error),
				});
			}
		}

		return result.increments;
	}
}
