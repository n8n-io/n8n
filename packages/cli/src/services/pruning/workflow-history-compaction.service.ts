import { Logger } from '@n8n/backend-common';
import { GlobalConfig, WorkflowHistoryCompactionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection, WorkflowHistoryRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sleep } from '@n8n/utils/sleep';
import { DiffMetaData, DiffRule, RULES, SKIP_RULES } from 'n8n-workflow';
import { strict } from 'node:assert';

import { EventService } from '@/events/event.service';
import { RelayEventMap } from '@/events/maps/relay.event-map';

/**
 * Responsible for compacting auto saved workflow history entries in the database.
 * The periodic cadence lives on the `workflow-history-compaction-optimize` and
 * `workflow-history-compaction-trim` system tasks.
 *
 * Every `optimizingTimeWindowHours` / 2 hours:
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
 *    only one version every minute to ten hours, depending on the size of the
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
	private isOptimizingHistories = false;
	private isTrimmingHistories = false;

	/** Aborts the detached startup passes, which no system task run owns. */
	private startupAbort = new AbortController();

	constructor(
		private readonly config: WorkflowHistoryCompactionConfig,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly dbConnection: DbConnection,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('workflow-history-compaction');
	}

	init() {
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		if (this.instanceSettings.isLeader) this.runStartupCompaction();
	}

	get isEnabled() {
		return this.instanceSettings.instanceType === 'main' && this.instanceSettings.isLeader;
	}

	/** Whether trimming may run at all: a prune horizon shorter than the trim window makes trimming pointless. */
	get isTrimmingEnabled() {
		return (
			this.globalConfig.workflowHistory.pruneTime === -1 ||
			this.globalConfig.workflowHistory.pruneTime * Time.hours.toMilliseconds >=
				this.config.trimmingMinimumAgeDays * Time.days.toMilliseconds
		);
	}

	// One-shot catch-up pass on startup and on leader change, so a gap between
	// leaders is compacted without waiting a full task interval.
	@OnLeaderTakeover()
	runStartupCompaction() {
		const { connectionState } = this.dbConnection;
		if (!this.isEnabled || !connectionState.migrated) return;
		if (this.config.skipOnStartUp) return;

		this.startupAbort = new AbortController();
		const { signal } = this.startupAbort;

		void this.optimizeHistories(signal);

		if (!this.isTrimmingEnabled) return;
		if (this.config.trimOnStartUp || new Date().getHours() === 3) {
			void this.trimLongRunningHistories(signal);
		}
	}

	// A startup pass runs detached, so losing leadership has to reach it here.
	// The task-driven passes get their signal from the system task runner.
	@OnLeaderStepdown()
	@OnShutdown()
	stopStartupCompaction(): void {
		this.startupAbort.abort();
	}

	/**
	 * One trimming pass over long-running histories. A pass overlapping a running
	 * one is skipped, and an aborted `signal` stops the pass at the next workflow.
	 */
	async trimLongRunningHistories(signal: AbortSignal): Promise<void> {
		if (this.isTrimmingHistories) {
			this.logger.debug('Skipping trimming as there is already a running iteration');
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
							[100, 10 * 60 * 1_000],
							[1000, 2 * 60 * 60 * 1_000],
							[5000, 5 * 60 * 60 * 1_000],
							[10000, 10 * 60 * 60 * 1_000],
						]),
					),
				],
				[],
				signal,
				{ workflowSizeScore: true },
			);
		} finally {
			this.isTrimmingHistories = false;
		}
	}

	/**
	 * One optimization pass over recent histories. A pass overlapping a running
	 * one is skipped, and an aborted `signal` stops the pass at the next workflow.
	 */
	async optimizeHistories(signal: AbortSignal): Promise<void> {
		if (this.isOptimizingHistories) {
			this.logger.debug('Skipping recent optimization as there is already a running iteration');
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
				signal,
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
		signal: AbortSignal,
		metaData: Partial<Record<keyof DiffMetaData, boolean>> = {},
	): Promise<void> {
		const compactionStartTime = Date.now();

		const startDate = new Date(compactionStartTime - startDeltaMs);
		const endDate = new Date(compactionStartTime - endDeltaMs);

		const startIso = startDate.toISOString();
		const endIso = endDate.toISOString();

		this.logger.debug('Starting workflow history compaction', {
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
		let workflowsProcessed = 0;
		let totalVersionsSeen = 0;
		let totalVersionsDeleted = 0;
		let errorCount = 0;
		for (const [index, workflowId] of workflowIds.entries()) {
			if (signal.aborted) {
				this.logger.debug(
					`Stopping workflow history compaction after ${index} of ${workflowIds.length} workflows, the pass was aborted`,
				);
				break;
			}
			workflowsProcessed += 1;

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
				await this.waitBetweenBatches(signal);
			}

			if (batchSum > this.config.batchSize) {
				this.logger.debug(
					`Encountered more than ${this.config.batchSize} workflow versions, waiting ${this.config.batchDelayMs * Time.milliseconds.toSeconds} second(s) before continuing.`,
				);
				this.logger.debug(
					`Compacted ${index} of ${workflowIds.length} workflows with versions between ${startIso} and ${endIso}`,
				);
				await this.waitBetweenBatches(signal);
				batchSum = 0;
			}
		}

		const durationMs = Date.now() - compactionStartTime;
		const payload = {
			workflowsProcessed,
			totalVersionsSeen,
			totalVersionsDeleted,
			errorCount,
			durationMs,
			compactionStartTime: new Date(compactionStartTime),
			windowStartIso: startIso,
			windowEndIso: endIso,
		} satisfies RelayEventMap['history-compacted'];
		this.logger.debug('Workflow history compaction complete', payload);

		// Runs are frequent and often find no work; only report runs that did something
		if (workflowIds.length > 0) this.eventService.emit('history-compacted', payload);
	}

	/** Waits out the batch delay, returning as soon as the pass is aborted. */
	private async waitBetweenBatches(signal: AbortSignal): Promise<void> {
		try {
			await sleep(this.config.batchDelayMs, signal);
		} catch {
			// `sleep` rejects only on abort, which the loop checks for on its own.
		}
	}
}
