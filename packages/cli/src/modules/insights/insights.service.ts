import type { InsightsSummary } from '@n8n/api-types';
import { Container, Service } from '@n8n/di';
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
import { InsightsMetadata } from '@/modules/insights/entities/insights-metadata';
import { InsightsRaw } from '@/modules/insights/entities/insights-raw';

import type { TypeUnit } from './entities/insights-shared';
import { NumberToType } from './entities/insights-shared';
import { InsightsConfig } from './insights.config';
import { InsightsByPeriodRepository } from './repositories/insights-by-period.repository';
import { InsightsRawRepository } from './repositories/insights-raw.repository';

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
	integrated: false,
	retry: false,
	trigger: false,
	webhook: false,
	evaluation: false,

	internal: true,
	manual: true,
};

@Service()
export class InsightsService {
	private compactInsightsTimer: NodeJS.Timer | undefined;

	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly insightsRawRepository: InsightsRawRepository,
	) {
		this.initializeCompaction();
	}

	initializeCompaction() {
		if (this.compactInsightsTimer !== undefined) {
			clearInterval(this.compactInsightsTimer);
		}
		const intervalMilliseconds = config.compactionIntervalMinutes * 60 * 1000;
		this.compactInsightsTimer = setInterval(
			async () => await this.compactInsights(),
			intervalMilliseconds,
		);
	}

	@OnShutdown()
	shutdown() {
		if (this.compactInsightsTimer !== undefined) {
			clearInterval(this.compactInsightsTimer);
			this.compactInsightsTimer = undefined;
		}
	}

	async workflowExecuteAfterHandler(ctx: ExecutionLifecycleHooks, fullRunData: IRun) {
		if (shouldSkipStatus[fullRunData.status] || shouldSkipMode[fullRunData.mode]) {
			return;
		}

		const status = fullRunData.status === 'success' ? 'success' : 'failure';

		await this.sharedWorkflowRepository.manager.transaction(async (trx) => {
			const sharedWorkflow = await trx.findOne(SharedWorkflow, {
				where: { workflowId: ctx.workflowData.id, role: 'workflow:owner' },
				relations: { project: true },
			});

			if (!sharedWorkflow) {
				throw new UnexpectedError(
					`Could not find an owner for the workflow with the name '${ctx.workflowData.name}' and the id '${ctx.workflowData.id}'`,
				);
			}

			await trx.upsert(
				InsightsMetadata,
				{
					workflowId: ctx.workflowData.id,
					workflowName: ctx.workflowData.name,
					projectId: sharedWorkflow.projectId,
					projectName: sharedWorkflow.project.name,
				},
				['workflowId'],
			);
			const metadata = await trx.findOneBy(InsightsMetadata, {
				workflowId: ctx.workflowData.id,
			});

			if (!metadata) {
				// This can't happen, we just wrote the metadata in the same
				// transaction.
				throw new UnexpectedError(
					`Could not find metadata for the workflow with the id '${ctx.workflowData.id}'`,
				);
			}

			// success or failure event
			{
				const event = new InsightsRaw();
				event.metaId = metadata.metaId;
				event.type = status;
				event.value = 1;
				await trx.insert(InsightsRaw, event);
			}

			// run time event
			if (fullRunData.stoppedAt) {
				const value = fullRunData.stoppedAt.getTime() - fullRunData.startedAt.getTime();
				const event = new InsightsRaw();
				event.metaId = metadata.metaId;
				event.type = 'runtime_ms';
				event.value = value;
				await trx.insert(InsightsRaw, event);
			}

			// time saved event
			if (status === 'success' && ctx.workflowData.settings?.timeSavedPerExecution) {
				const event = new InsightsRaw();
				event.metaId = metadata.metaId;
				event.type = 'time_saved_min';
				event.value = ctx.workflowData.settings.timeSavedPerExecution;
				await trx.insert(InsightsRaw, event);
			}
		});
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
	}

	// Compacts raw data to hourly aggregates
	async compactRawToHour() {
		// Build the query to gather raw insights data for the batch
		const batchQuery = this.insightsRawRepository.getRawInsightsBatchQuery(
			config.compactionBatchSize,
		);

		return await this.insightsByPeriodRepository.compactSourceDataIntoInsightPeriod({
			sourceBatchQuery: batchQuery.getSql(),
			sourceTableName: this.insightsRawRepository.metadata.tableName,
			periodUnit: 'hour',
		});
	}

	// Compacts hourly data to daily aggregates
	async compactHourToDay() {
		// get hour data query for batching
		const batchQuery = this.insightsByPeriodRepository.getPeriodInsightsBatchQuery(
			'hour',
			config.compactionBatchSize,
		);

		return await this.insightsByPeriodRepository.compactSourceDataIntoInsightPeriod({
			sourceBatchQuery: batchQuery.getSql(),
			periodUnit: 'day',
		});
	}

	// TODO: add return type once rebased on master and InsightsSummary is
	// available
	async getInsightsSummary(): Promise<InsightsSummary> {
		const rows = await this.insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates();

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
			currentTotal > 0 ? Math.round((currentFailures / currentTotal) * 100) / 100 : 0;
		const previousFailureRate =
			previousTotal > 0 ? Math.round((previousFailures / previousTotal) * 100) / 100 : 0;

		const currentTotalRuntime = getValueByType('current', 'runtime_ms') ?? 0;
		const previousTotalRuntime = getValueByType('previous', 'runtime_ms') ?? 0;

		const currentAvgRuntime =
			currentTotal > 0 ? Math.round((currentTotalRuntime / currentTotal) * 100) / 100 : 0;
		const previousAvgRuntime =
			previousTotal > 0 ? Math.round((previousTotalRuntime / previousTotal) * 100) / 100 : 0;

		const currentTimeSaved = getValueByType('current', 'time_saved_min');
		const previousTimeSaved = getValueByType('previous', 'time_saved_min');

		// Return the formatted result
		const result: InsightsSummary = {
			averageRunTime: {
				value: currentAvgRuntime,
				unit: 'time',
				deviation: currentAvgRuntime - previousAvgRuntime,
			},
			failed: {
				value: currentFailures,
				unit: 'count',
				deviation: currentFailures - previousFailures,
			},
			failureRate: {
				value: currentFailureRate,
				unit: 'ratio',
				deviation: currentFailureRate - previousFailureRate,
			},
			timeSaved: {
				value: currentTimeSaved,
				unit: 'time',
				deviation: currentTimeSaved - previousTimeSaved,
			},
			total: {
				value: currentTotal,
				unit: 'count',
				deviation: currentTotal - previousTotal,
			},
		};

		return result;
	}
}
