import { Logger } from '@n8n/backend-common';
import { WorkflowHistoryCompactionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection, WorkflowHistoryRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { DiffRule, ensureError, RULES, SKIP_RULES, sleep } from 'n8n-workflow';
import { strict } from 'node:assert';

/**
 * Responsible for compacting auto saved workflow history entries in the database.
 *
 * Every hour (`compactingTimeWindowHours` / 2):
 *
 * 1. Find workflows with new versions in the time window determined
 *    by `compactingMinimumAgeHours` and `compactingTimeWindowHours`
 *
 * 2. For each workflow, fetch all versions in that window and remove
 *    versions based on workflowHistoryRepo.pruneHistory.
 *
 * This currently removes any *redundant* versions, i.e. versions
 * which hold no meaningful data compared to the next iteration
 * e.g. only change is node parameter { a: 'the quick' } to { a: 'the quick brown fox' }
 *
 * We may introduce more stricter rules in the future, likely with
 * a mechanism to run this pruning on demand.
 */
@Service()
export class WorkflowHistoryCompactionService {
	private compactingInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private isCompactingRecentHistories = false;

	constructor(
		private readonly config: WorkflowHistoryCompactionConfig,
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly dbConnection: DbConnection,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
	) {
		this.logger = this.logger.scoped('workflow-history-compaction');
	}

	init() {
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		if (this.instanceSettings.isLeader) this.startCompacting();
	}

	get isEnabled() {
		return this.instanceSettings.instanceType === 'main' && this.instanceSettings.isLeader;
	}

	@OnLeaderTakeover()
	startCompacting() {
		const { connectionState } = this.dbConnection;
		if (!this.isEnabled || !connectionState.migrated || this.isShuttingDown) return;

		this.logger.debug('Started workflow histories compaction', { ...this.config });

		this.scheduleRollingCompacting();

		if (this.config.compactOnStartUp) {
			this.logger.debug('Compacting on start up');
			void this.compactRecentHistories();
		}
	}

	@OnLeaderStepdown()
	stopCompacting() {
		if (!this.compactingInterval) return;

		clearInterval(this.compactingInterval);

		this.logger.debug('Stopped workflow histories compaction');
	}

	private scheduleRollingCompacting() {
		// We run compaction twice as often as the window for which we compact workflows
		// This allows redundancy for covering first and last versions in the window, accounts
		// for restarts and other small gaps, e.g. caused by the next internal needing to wait
		// for computing resources if the instance is busy
		const rateMs = (this.config.compactingTimeWindowHours / 2) * Time.hours.toMilliseconds;
		this.compactingInterval = setInterval(async () => await this.compactRecentHistories(), rateMs);

		this.logger.debug(
			`Compacting histories every ${this.config.compactingTimeWindowHours / 2.0} hour(s)`,
		);
	}

	@OnShutdown()
	shutdown(): void {
		this.isShuttingDown = true;
		this.stopCompacting();
	}

	private async compactRecentHistories(): Promise<void> {
		if (this.isCompactingRecentHistories) {
			this.logger.warn('Skipping recent compaction as there is already a running iteration');
			return;
		}
		this.isCompactingRecentHistories = true;

		const startDelta =
			(this.config.compactingMinimumAgeHours + this.config.compactingTimeWindowHours) *
			Time.hours.toMilliseconds;
		const endDelta = this.config.compactingMinimumAgeHours * Time.hours.toMilliseconds;

		try {
			await this.compactHistories(
				startDelta,
				endDelta,
				[RULES.mergeAdditiveChanges],
				[SKIP_RULES.makeSkipTimeDifference(this.config.minimumTimeBetweenSessionsMs)],
			);
		} finally {
			this.isCompactingRecentHistories = false;
		}
	}

	private async compactHistories(
		startDeltaMs: number,
		endDeltaMs: number,
		rules: DiffRule[],
		skipRules: DiffRule[],
	): Promise<void> {
		const compactionStartTime = Date.now();

		const startDate = new Date(compactionStartTime - startDeltaMs);
		const endDate = new Date(compactionStartTime - endDeltaMs);

		const startIso = startDate.toISOString();
		const endIso = endDate.toISOString();

		this.logger.info('Starting workflow history compaction', {
			dateRange: { start: startIso, end: endIso },
			config: this.config,
		});

		const workflowIds = await this.workflowHistoryRepository.getWorkflowIdsInRange(
			startDate,
			endDate,
		);

		this.logger.debug(
			`Found ${workflowIds.length} workflows with versions between ${startIso} and ${endIso}`,
		);

		let batchSum = 0;
		let totalVersionsSeen = 0;
		let totalVersionsDeleted = 0;
		let errorCount = 0;
		for (const [index, workflowId] of workflowIds.entries()) {
			try {
				const { seen, deleted } = await this.workflowHistoryRepository.pruneHistory(
					workflowId,
					startDate,
					endDate,
					rules,
					skipRules,
				);
				batchSum += seen;
				totalVersionsSeen += seen;
				totalVersionsDeleted += deleted;

				this.logger.debug(
					`Deleted ${deleted} of ${seen} versions of workflow ${workflowId} between ${startIso} and ${endIso}`,
				);
			} catch (error) {
				errorCount += 1;
				this.logger.error(`Failed to prune version history of workflow ${workflowId}`, {
					error: ensureError(error),
				});

				// Sleep after error to back off
				await sleep(this.config.batchDelayMs);
			}

			if (batchSum > this.config.batchSize) {
				this.logger.debug(
					`Encountered more than ${this.config.batchSize} workflow versions, waiting ${this.config.batchDelayMs * Time.milliseconds.toSeconds} second(s) before continuing.`,
				);
				this.logger.debug(
					`Compacted ${index} of ${workflowIds.length} workflows with versions between ${startIso} and ${endIso}`,
				);
				await sleep(this.config.batchDelayMs);
				batchSum = 0;
			}
		}

		const durationMs = Date.now() - compactionStartTime;
		this.logger.info('Workflow history compaction complete', {
			workflowsProcessed: workflowIds.length,
			totalVersionsSeen,
			totalVersionsDeleted,
			errorCount,
			durationMs,
			dateRange: { start: startIso, end: endIso },
		});
	}
}
