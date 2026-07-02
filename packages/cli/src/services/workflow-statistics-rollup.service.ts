import { Logger } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection, DbLock, DbLockService, WorkflowStatisticsRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
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

	/**
	 * Whether the timer loop is currently scheduled. Distinct from a live `isLeader` check: it is the
	 * loop's own run-state (set on takeover, cleared on stepdown/shutdown) and gates the async
	 * reschedule, so a tick that resolves after `stop()` does not requeue itself.
	 */
	private isActive = false;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly dbConnection: DbConnection,
		private readonly databaseConfig: DatabaseConfig,
		private readonly dbLockService: DbLockService,
		private readonly repository: WorkflowStatisticsRepository,
		private readonly statisticsService: WorkflowStatisticsService,
	) {
		this.logger = this.logger.scoped('workflow-statistics');
	}

	get shouldRun() {
		return (
			this.databaseConfig.type === 'postgresdb' &&
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
			let nextDelayMs = STEADY_INTERVAL_MS;
			void this.rollup()
				.then((increments) => {
					if (increments >= BATCH_SIZE) nextDelayMs = BUSY_INTERVAL_MS; // backlog remaining
				})
				.catch((error) => {
					this.errorReporter.error(error, { shouldBeLogged: true });
				})
				.finally(() => {
					if (this.isActive) this.scheduleNext(nextDelayMs);
				});
		}, delayMs);
	}

	/** Fold one batch of increments and fire any resulting milestones. Returns increments folded. */
	private async rollup(): Promise<number> {
		const result = await this.foldBatch();
		if (!result) return 0;

		await this.emitMilestones(result.firstOccurrences);

		return result.increments;
	}

	/** Fold a batch under an advisory lock. Returns null if another instance holds the lock. */
	private async foldBatch(): Promise<RollupResult | null> {
		try {
			return await this.dbLockService.tryWithLock(
				DbLock.WORKFLOW_STATISTICS_ROLLUP,
				async (tx) => await this.repository.rollupIncrements(tx, BATCH_SIZE),
			);
		} catch (error) {
			if (error instanceof OperationalError) return null; // another instance holds the lock
			throw error;
		}
	}

	/** Fire the one-time milestone event for each workflow whose counter row was just created. */
	private async emitMilestones(firstOccurrences: RollupResult['firstOccurrences']): Promise<void> {
		for (const occurrence of firstOccurrences) {
			try {
				await this.statisticsService.emitFirstOccurrenceEvent(
					occurrence.name,
					occurrence.workflowId,
					occurrence.workflowName,
					occurrence.firstEventMs,
				);
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}
	}
}
