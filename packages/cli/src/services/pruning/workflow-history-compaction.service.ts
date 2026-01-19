import { Logger } from '@n8n/backend-common';
import { GlobalConfig, WorkflowHistoryCompactionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection, WorkflowHistoryRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { DiffMetaData, DiffRule, ensureError, RULES, SKIP_RULES, sleep } from 'n8n-workflow';
import { strict } from 'node:assert';

/**
 * Responsible for compacting auto saved workflow history entries in the database.
 *
 * Every hour (`optimizingTimeWindowHours` / 2):
 *
 * 1. Find workflows with new versions in the time window determined
 *    by `optimizingMinimumAgeHours` and `optimizingTimeWindowHours`
 *
 * 2. For each workflow, fetch all versions in that window and remove
 *    redundant versions i.e. versions which hold no meaningful data compared
 *    to the next iteration, e.g. only change is node parameter { a: 'the quick' }
 *    to { a: 'the quick brown fox' }
 *
 * Every day:
 *
 * 1. Find workflows with new versions in the time window determined
 *    by `trimmingMinimumAgeDays` and `trimmingTimeWindowDays`
 *
 * 2. For each workflow, fetch all versions in that window and leave behind
 *    only one version every minute to four hours, depending on the size of the
 *    workflow.
 *
 * Neither of these operations will remove active or named versions, and a version
 * followed by a version from a different author.
 *
 * This compaction happens in addition to workflow history pruning.
 *
 */
@Service()
export class WorkflowHistoryCompactionService {
	private optimizingInterval: NodeJS.Timeout | undefined;
	private trimmingInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private isOptimizingHistories = false;
	private isTrimmingHistories = false;

	constructor(
		private readonly config: WorkflowHistoryCompactionConfig,
		private readonly globalConfig: GlobalConfig,
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

		this.logger.debug('Started workflow histories optimization and trimming', { ...this.config });

		this.scheduleOptimization();
		this.scheduleTrimming();
	}

	@OnLeaderStepdown()
	stopCompacting() {
		if (!this.optimizingInterval && !this.trimmingInterval) return;

		clearInterval(this.optimizingInterval);
		clearInterval(this.trimmingInterval);

		this.logger.debug('Stopped workflow histories compaction and trimming');
	}

	private scheduleTrimming() {
		if (
			this.globalConfig.workflowHistory.pruneTime !== -1 &&
			this.globalConfig.workflowHistory.pruneTime * Time.hours.toMilliseconds <
				this.config.trimmingMinimumAgeDays * Time.days.toMilliseconds
		) {
			this.logger.info('Skipping workflow history trimming as pruneAge < trimmingMinimumAge');
			return;
		}

		// This is written this way as it needs to account for leader changes and in particular
		// the same instance being re-elected leader, so just starting a 1 day interval is unlikely
		// to ever trigger in queue mode/multi-main
		const trimOnceADay = async () => {
			if (new Date().getHours() === 3) {
				await this.trimLongRunningHistories();
			}
		};

		this.trimmingInterval = setInterval(trimOnceADay, 1 * Time.hours.toMilliseconds);

		if (this.config.trimOnStartUp) {
			void this.trimLongRunningHistories();
		} else {
			void trimOnceADay();
		}

		this.logger.debug('Trimming histories once a day at 3am server time');
	}

	private scheduleOptimization() {
		// We run optimization twice as often as the window for which we optimize workflows
		// This allows redundancy for covering first and last versions in the window, accounts
		// for restarts and other small gaps, e.g. caused by the next internal needing to wait
		// for computing resources if the instance is busy
		const rateMs = (this.config.optimizingTimeWindowHours / 2) * Time.hours.toMilliseconds;
		this.optimizingInterval = setInterval(async () => await this.optimizeHistories(), rateMs);

		this.logger.debug(
			`Optimizing histories every ${this.config.optimizingTimeWindowHours / 2.0} hour(s)`,
		);

		void this.optimizeHistories();
	}

	@OnShutdown()
	shutdown(): void {
		this.isShuttingDown = true;
		this.stopCompacting();
	}

	private async trimLongRunningHistories(): Promise<void> {
		if (this.isTrimmingHistories) {
			this.logger.warn('Skipping trimming as there is already a running iteration');
			return;
		}
		this.isTrimmingHistories = true;

		const startDelta =
			(this.config.trimmingMinimumAgeDays + this.config.trimmingTimeWindowDays) *
			Time.days.toMilliseconds;
		const endDelta = this.config.trimmingMinimumAgeDays * Time.days.toMilliseconds;

		try {
			await this.compactHistories(
				startDelta,
				endDelta,
				[
					RULES.makeMergeDependingOnSizeRule(
						new Map([
							[0, 60 * 1_000],
							[100, 5 * 60 * 1_000],
							[1000, 30 * 60 * 1_000],
							[5000, 60 * 60 * 1_000],
							[10000, 4 * 60 * 60 * 1_000],
						]),
					),
				],
				[],
				{ workflowSizeScore: true },
			);
		} finally {
			this.isTrimmingHistories = false;
		}
	}

	private async optimizeHistories(): Promise<void> {
		if (this.isOptimizingHistories) {
			this.logger.warn('Skipping recent optimization as there is already a running iteration');
			return;
		}
		this.isOptimizingHistories = true;

		const startDelta =
			(this.config.optimizingMinimumAgeHours + this.config.optimizingTimeWindowHours) *
			Time.hours.toMilliseconds;
		const endDelta = this.config.optimizingMinimumAgeHours * Time.hours.toMilliseconds;

		try {
			await this.compactHistories(
				startDelta,
				endDelta,
				[RULES.mergeAdditiveChanges],
				[SKIP_RULES.makeSkipTimeDifference(20 * 60 * 1000)],
			);
		} finally {
			this.isOptimizingHistories = false;
		}
	}

	private async compactHistories(
		startDeltaMs: number,
		endDeltaMs: number,
		rules: DiffRule[],
		skipRules: DiffRule[],
		metaData: Partial<Record<keyof DiffMetaData, boolean>> = {},
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
					metaData,
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
