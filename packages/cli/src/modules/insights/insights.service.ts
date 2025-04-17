import type { InsightsSummary } from '@n8n/api-types';
import { Container, Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { DateTime } from 'luxon';
import { Logger } from 'n8n-core';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import {
	UnexpectedError,
	type ExecutionStatus,
	type IRun,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { SharedWorkflow } from '@/databases/entities/shared-workflow';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { OnShutdown } from '@/decorators/on-shutdown';
import { InsightsMetadata } from '@/modules/insights/database/entities/insights-metadata';
import { InsightsRaw } from '@/modules/insights/database/entities/insights-raw';

import type { PeriodUnit, TypeUnit } from './database/entities/insights-shared';
import { NumberToType } from './database/entities/insights-shared';
import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsRawRepository } from './database/repositories/insights-raw.repository';
import { InsightsConfig } from './insights.config';

const config = Container.get(InsightsConfig);

const shouldSkipStatus: Record<ExecutionStatus, boolean> = {
	success: false,
	crashed: false,
	error: false,

	canceled: true,
	new: true,
	running: true,
	unknown: true,
	waiting: true,
};

const shouldSkipMode: Record<WorkflowExecuteMode, boolean> = {
	cli: false,
	error: false,
	retry: false,
	trigger: false,
	webhook: false,
	evaluation: false,

	// sub workflows
	integrated: true,

	// error workflows
	internal: true,

	manual: true,
};

type BufferedInsight = Pick<InsightsRaw, 'type' | 'value' | 'timestamp'> & {
	workflowId: string;
	workflowName: string;
};

@Service()
export class InsightsService {
	private readonly cachedMetadata: Map<string, InsightsMetadata> = new Map();

	private compactInsightsTimer: NodeJS.Timer | undefined;

	private bufferedInsights: Set<BufferedInsight> = new Set();

	private flushInsightsRawBufferTimer: NodeJS.Timeout | undefined;

	private isAsynchronouslySavingInsights = true;

	private flushesInProgress: Set<Promise<void>> = new Set();

	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly insightsRawRepository: InsightsRawRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('insights');
	}

	startBackgroundProcess() {
		this.startCompactionScheduler();
		this.startFlushingScheduler();
	}

	stopBackgroundProcess() {
		this.stopCompactionScheduler();
		this.stopFlushingScheduler();
	}

	// Initialize regular compaction of insights data
	private startCompactionScheduler() {
		this.stopCompactionScheduler();
		const intervalMilliseconds = config.compactionIntervalMinutes * 60 * 1000;
		this.compactInsightsTimer = setInterval(
			async () => await this.compactInsights(),
			intervalMilliseconds,
		);
	}

	// Stop regular compaction of insights data
	private stopCompactionScheduler() {
		if (this.compactInsightsTimer !== undefined) {
			clearInterval(this.compactInsightsTimer);
			this.compactInsightsTimer = undefined;
		}
	}

	private startFlushingScheduler() {
		this.isAsynchronouslySavingInsights = true;
		this.stopFlushingScheduler();
		this.flushInsightsRawBufferTimer = setTimeout(
			async () => await this.flushEvents(),
			config.flushIntervalSeconds * 1000,
		);
	}

	private stopFlushingScheduler() {
		if (this.flushInsightsRawBufferTimer !== undefined) {
			clearTimeout(this.flushInsightsRawBufferTimer);
			this.flushInsightsRawBufferTimer = undefined;
		}
	}

	@OnShutdown()
	async shutdown() {
		this.stopCompactionScheduler();
		this.stopFlushingScheduler();

		// Prevent new insights from being added to the buffer (and never flushed)
		// when remaining workflows are handled during shutdown
		this.isAsynchronouslySavingInsights = false;

		// Wait for all in-progress asynchronous flushes
		// Flush any remaining events
		await Promise.all([...this.flushesInProgress, this.flushEvents()]);
	}

	async workflowExecuteAfterHandler(ctx: ExecutionLifecycleHooks, fullRunData: IRun) {
		if (shouldSkipStatus[fullRunData.status] || shouldSkipMode[fullRunData.mode]) {
			return;
		}

		const status = fullRunData.status === 'success' ? 'success' : 'failure';

		const commonWorkflowData = {
			workflowId: ctx.workflowData.id,
			workflowName: ctx.workflowData.name,
			timestamp: DateTime.utc().toJSDate(),
		};

		// success or failure event
		this.bufferedInsights.add({
			...commonWorkflowData,
			type: status,
			value: 1,
		});

		// run time event
		if (fullRunData.stoppedAt) {
			const value = fullRunData.stoppedAt.getTime() - fullRunData.startedAt.getTime();
			this.bufferedInsights.add({
				...commonWorkflowData,
				type: 'runtime_ms',
				value,
			});
		}

		// time saved event
		if (status === 'success' && ctx.workflowData.settings?.timeSavedPerExecution) {
			this.bufferedInsights.add({
				...commonWorkflowData,
				type: 'time_saved_min',
				value: ctx.workflowData.settings.timeSavedPerExecution,
			});
		}

		if (!this.isAsynchronouslySavingInsights) {
			// If we are not asynchronously saving insights, we need to flush the events
			await this.flushEvents();
		}

		// If the buffer is full, flush the events asynchronously
		if (this.bufferedInsights.size >= config.flushBatchSize) {
			// Fire and forget flush to avoid blocking the workflow execute after handler
			void this.flushEvents();
		}
	}

	async saveInsightsMetadataAndRaw(insightsRawToInsertBuffer: Set<BufferedInsight>) {
		const workflowIdNames: Map<string, string> = new Map();

		for (const event of insightsRawToInsertBuffer) {
			workflowIdNames.set(event.workflowId, event.workflowName);
		}

		await this.sharedWorkflowRepository.manager.transaction(async (trx) => {
			const sharedWorkflows = await trx.find(SharedWorkflow, {
				where: { workflowId: In([...workflowIdNames.keys()]), role: 'workflow:owner' },
				relations: { project: true },
			});

			// Upsert metadata for the workflows that are not already in the cache or have
			// different project or workflow names
			const metadataToUpsert = sharedWorkflows.reduce((acc, workflow) => {
				const cachedMetadata = this.cachedMetadata.get(workflow.workflowId);
				if (
					!cachedMetadata ||
					cachedMetadata.projectId !== workflow.projectId ||
					cachedMetadata.projectName !== workflow.project.name ||
					cachedMetadata.workflowName !== workflowIdNames.get(workflow.workflowId)
				) {
					const metadata = new InsightsMetadata();
					metadata.projectId = workflow.projectId;
					metadata.projectName = workflow.project.name;
					metadata.workflowId = workflow.workflowId;
					metadata.workflowName = workflowIdNames.get(workflow.workflowId)!;

					acc.push(metadata);
				}
				return acc;
			}, [] as InsightsMetadata[]);

			await trx.upsert(InsightsMetadata, metadataToUpsert, ['workflowId']);

			const upsertMetadata = await trx.findBy(InsightsMetadata, {
				workflowId: In(metadataToUpsert.map((m) => m.workflowId)),
			});
			for (const metadata of upsertMetadata) {
				this.cachedMetadata.set(metadata.workflowId, metadata);
			}

			const events: InsightsRaw[] = [];
			for (const event of insightsRawToInsertBuffer) {
				const insight = new InsightsRaw();
				const metadata = this.cachedMetadata.get(event.workflowId);
				if (!metadata) {
					// could not find shared workflow for this insight (not supposed to happen)
					throw new UnexpectedError(
						`Could not find shared workflow for insight with workflowId ${event.workflowId}`,
					);
				}
				insight.metaId = metadata.metaId;
				insight.type = event.type;
				insight.value = event.value;
				insight.timestamp = event.timestamp;

				events.push(insight);
			}

			await trx.insert(InsightsRaw, events);
		});
	}

	async flushEvents() {
		// Prevent flushing if there are no events to flush
		if (this.bufferedInsights.size === 0) {
			// reschedule the timer to flush again
			this.startFlushingScheduler();
			return;
		}

		// Stop timer to prevent concurrent flush from timer
		this.stopFlushingScheduler();

		// Copy the buffer to a new set to avoid concurrent modification
		// while we are flushing the events
		const bufferedInsightsToFlush = new Set(this.bufferedInsights);
		this.bufferedInsights.clear();

		let flushPromise: Promise<void> | undefined = undefined;
		flushPromise = (async () => {
			try {
				await this.saveInsightsMetadataAndRaw(bufferedInsightsToFlush);
			} catch (e) {
				this.logger.error('Error while saving insights metadata and raw data', { error: e });
				for (const event of bufferedInsightsToFlush) {
					this.bufferedInsights.add(event);
				}
			} finally {
				this.startFlushingScheduler();
				this.flushesInProgress.delete(flushPromise!);
			}
		})();

		// Add the flush promise to the set of flushes in progress for shutdown await
		this.flushesInProgress.add(flushPromise);
		await flushPromise;
	}

	async compactInsights() {
		let numberOfCompactedRawData: number;

		// Compact raw data to hourly aggregates
		do {
			numberOfCompactedRawData = await this.compactRawToHour();
		} while (numberOfCompactedRawData > 0);

		let numberOfCompactedHourData: number;

		// Compact hourly data to daily aggregates
		do {
			numberOfCompactedHourData = await this.compactHourToDay();
		} while (numberOfCompactedHourData > 0);

		let numberOfCompactedDayData: number;
		// Compact daily data to weekly aggregates
		do {
			numberOfCompactedDayData = await this.compactDayToWeek();
		} while (numberOfCompactedDayData > 0);
	}

	// Compacts raw data to hourly aggregates
	async compactRawToHour() {
		// Build the query to gather raw insights data for the batch
		const batchQuery = this.insightsRawRepository.getRawInsightsBatchQuery(
			config.compactionBatchSize,
		);

		return await this.insightsByPeriodRepository.compactSourceDataIntoInsightPeriod({
			sourceBatchQuery: batchQuery,
			sourceTableName: this.insightsRawRepository.metadata.tableName,
			periodUnitToCompactInto: 'hour',
		});
	}

	// Compacts hourly data to daily aggregates
	async compactHourToDay() {
		// get hour data query for batching
		const batchQuery = this.insightsByPeriodRepository.getPeriodInsightsBatchQuery({
			periodUnitToCompactFrom: 'hour',
			compactionBatchSize: config.compactionBatchSize,
			maxAgeInDays: config.compactionHourlyToDailyThresholdDays,
		});

		return await this.insightsByPeriodRepository.compactSourceDataIntoInsightPeriod({
			sourceBatchQuery: batchQuery,
			periodUnitToCompactInto: 'day',
		});
	}

	// Compacts daily data to weekly aggregates
	async compactDayToWeek() {
		// get daily data query for batching
		const batchQuery = this.insightsByPeriodRepository.getPeriodInsightsBatchQuery({
			periodUnitToCompactFrom: 'day',
			compactionBatchSize: config.compactionBatchSize,
			maxAgeInDays: config.compactionDailyToWeeklyThresholdDays,
		});

		return await this.insightsByPeriodRepository.compactSourceDataIntoInsightPeriod({
			sourceBatchQuery: batchQuery,
			periodUnitToCompactInto: 'week',
		});
	}

	async getInsightsSummary({
		periodLengthInDays,
	}: { periodLengthInDays: number }): Promise<InsightsSummary> {
		const rows = await this.insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates({
			periodLengthInDays,
		});

		// Initialize data structures for both periods
		const data = {
			current: { byType: {} as Record<TypeUnit, number> },
			previous: { byType: {} as Record<TypeUnit, number> },
		};

		// Organize data by period and type
		rows.forEach((row) => {
			const { period, type, total_value } = row;
			if (!data[period]) return;

			data[period].byType[NumberToType[type]] = total_value ? Number(total_value) : 0;
		});

		// Get values with defaults for missing data
		const getValueByType = (period: 'current' | 'previous', type: TypeUnit) =>
			data[period]?.byType[type] ?? 0;

		// Calculate metrics
		const currentSuccesses = getValueByType('current', 'success');
		const currentFailures = getValueByType('current', 'failure');
		const previousSuccesses = getValueByType('previous', 'success');
		const previousFailures = getValueByType('previous', 'failure');

		const currentTotal = currentSuccesses + currentFailures;
		const previousTotal = previousSuccesses + previousFailures;

		const currentFailureRate =
			currentTotal > 0 ? Math.round((currentFailures / currentTotal) * 1000) / 1000 : 0;
		const previousFailureRate =
			previousTotal > 0 ? Math.round((previousFailures / previousTotal) * 1000) / 1000 : 0;

		const currentTotalRuntime = getValueByType('current', 'runtime_ms') ?? 0;
		const previousTotalRuntime = getValueByType('previous', 'runtime_ms') ?? 0;

		const currentAvgRuntime =
			currentTotal > 0 ? Math.round((currentTotalRuntime / currentTotal) * 100) / 100 : 0;
		const previousAvgRuntime =
			previousTotal > 0 ? Math.round((previousTotalRuntime / previousTotal) * 100) / 100 : 0;

		const currentTimeSaved = getValueByType('current', 'time_saved_min');
		const previousTimeSaved = getValueByType('previous', 'time_saved_min');

		// If the previous period has no executions, we discard deviation
		const getDeviation = (current: number, previous: number) =>
			previousTotal === 0 ? null : current - previous;

		// Return the formatted result
		const result: InsightsSummary = {
			averageRunTime: {
				value: currentAvgRuntime,
				unit: 'millisecond',
				deviation: getDeviation(currentAvgRuntime, previousAvgRuntime),
			},
			failed: {
				value: currentFailures,
				unit: 'count',
				deviation: getDeviation(currentFailures, previousFailures),
			},
			failureRate: {
				value: currentFailureRate,
				unit: 'ratio',
				deviation: getDeviation(currentFailureRate, previousFailureRate),
			},
			timeSaved: {
				value: currentTimeSaved,
				unit: 'minute',
				deviation: getDeviation(currentTimeSaved, previousTimeSaved),
			},
			total: {
				value: currentTotal,
				unit: 'count',
				deviation: getDeviation(currentTotal, previousTotal),
			},
		};

		return result;
	}

	async getInsightsByWorkflow({
		maxAgeInDays,
		skip = 0,
		take = 10,
		sortBy = 'total:desc',
	}: {
		maxAgeInDays: number;
		skip?: number;
		take?: number;
		sortBy?: string;
	}) {
		const { count, rows } = await this.insightsByPeriodRepository.getInsightsByWorkflow({
			maxAgeInDays,
			skip,
			take,
			sortBy,
		});

		return {
			count,
			data: rows,
		};
	}

	async getInsightsByTime({
		maxAgeInDays,
		periodUnit,
	}: { maxAgeInDays: number; periodUnit: PeriodUnit }) {
		const rows = await this.insightsByPeriodRepository.getInsightsByTime({
			maxAgeInDays,
			periodUnit,
		});

		return rows.map((r) => {
			const total = r.succeeded + r.failed;
			return {
				date: r.periodStart,
				values: {
					total,
					succeeded: r.succeeded,
					failed: r.failed,
					failureRate: r.failed / total,
					averageRunTime: r.runTime / total,
					timeSaved: r.timeSaved,
				},
			};
		});
	}
}
