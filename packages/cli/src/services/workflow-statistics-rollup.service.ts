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

/** Consecutive lock skips after which to warn that the lock is persistently held elsewhere. */
const SKIP_WARN_THRESHOLD = 5;

/**
 * Folds statistics increments in the `workflow_statistics_delta` table
 * into the `workflow_statistics` table.
 */
@Service()
export class WorkflowStatisticsRollupService {
	private timeout: NodeJS.Timeout | undefined;

	/** Tracks the in-flight tick so `shutdown` can await it. */
	private inflightRollup: Promise<void> | undefined;

	private isShuttingDown = false;

	private consecutiveLockSkips = 0;

	private totalLockSkips = 0;

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
		if (!this.shouldRun || this.timeout !== undefined) return;

		this.scheduleNext(0);
		this.logger.debug('Workflow statistics rollup interval started');
	}

	@OnLeaderStepdown()
	stop() {
		clearTimeout(this.timeout);
		this.timeout = undefined;
	}

	@OnShutdown()
	async shutdown() {
		this.isShuttingDown = true;
		clearTimeout(this.timeout);
		this.timeout = undefined;
		await this.inflightRollup;
	}

	private scheduleNext(delayMs: number) {
		this.timeout = setTimeout(() => {
			let nextDelayMs = STEADY_INTERVAL_MS;
			this.inflightRollup = this.rollup()
				.then((increments) => {
					if (increments >= BATCH_SIZE) nextDelayMs = BUSY_INTERVAL_MS; // backlog remaining
				})
				.catch((error) => {
					this.errorReporter.error(error, { shouldBeLogged: true });
				})
				.finally(() => {
					this.inflightRollup = undefined;
					if (this.timeout !== undefined) this.scheduleNext(nextDelayMs);
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
			const result = await this.dbLockService.tryWithLock(
				DbLock.WORKFLOW_STATISTICS_ROLLUP,
				async (tx) => await this.repository.rollupIncrements(tx, BATCH_SIZE),
			);
			this.consecutiveLockSkips = 0;
			return result;
		} catch (error) {
			if (error instanceof OperationalError) {
				this.registerLockSkip(); // another instance holds the lock
				return null;
			}
			throw error;
		}
	}

	/**
	 * Occasional skips are expected around leader transitions; persistent skips suggest a process
	 * outside this deployment holds the lock, e.g. a second n8n instance sharing this database
	 * (advisory locks are not schema- or table-prefix-scoped).
	 */
	private registerLockSkip() {
		this.consecutiveLockSkips++;
		this.totalLockSkips++;

		if (this.consecutiveLockSkips % SKIP_WARN_THRESHOLD !== 0) return;

		this.logger.warn(
			'Workflow statistics rollup repeatedly skipped: lock held by another process',
			{
				consecutiveLockSkips: this.consecutiveLockSkips,
				totalLockSkips: this.totalLockSkips,
			},
		);
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
