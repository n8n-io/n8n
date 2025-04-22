import type { InsightsSummary } from '@n8n/api-types';
import type { InsightsDateRange } from '@n8n/api-types/src/schemas/insights.schema';
import { Service } from '@n8n/di';
import { Logger } from 'n8n-core';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import type { IRun } from 'n8n-workflow';

import { OnShutdown } from '@/decorators/on-shutdown';
import { License } from '@/license';

import type { PeriodUnit, TypeUnit } from './database/entities/insights-shared';
import { NumberToType } from './database/entities/insights-shared';
import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsCollectionService } from './insights-collection.service';
import { InsightsCompactionService } from './insights-compaction.service';

@Service()
export class InsightsService {
	constructor(
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly compactionService: InsightsCompactionService,
		private readonly collectionService: InsightsCollectionService,
		private readonly license: License,
		private readonly logger: Logger,
	) {}

	startBackgroundProcess() {
		this.compactionService.startCompactionTimer();
		this.collectionService.startFlushingTimer();
		this.logger.debug('Started compaction and flushing schedulers');
	}

	stopBackgroundProcess() {
		this.compactionService.stopCompactionTimer();
		this.collectionService.stopFlushingTimer();
		this.logger.debug('Stopped compaction and flushing schedulers');
	}

	@OnShutdown()
	async shutdown() {
		await this.collectionService.shutdown();
		this.compactionService.stopCompactionTimer();
	}

	async workflowExecuteAfterHandler(ctx: ExecutionLifecycleHooks, fullRunData: IRun) {
		await this.collectionService.workflowExecuteAfterHandler(ctx, fullRunData);
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

	getAvailableDateRanges(): InsightsDateRange[] {
		const maxHistoryInDays = this.license.getInsightsMaxHistory();
		const isHourlyDateEnabled = this.license.isInsightsHourlyDataEnabled();

		return [
			{ key: 'day', licensed: isHourlyDateEnabled ?? false, granularity: 'hour' },
			{ key: 'week', licensed: maxHistoryInDays >= 7, granularity: 'day' },
			{ key: '2weeks', licensed: maxHistoryInDays >= 14, granularity: 'day' },
			{ key: 'month', licensed: maxHistoryInDays >= 30, granularity: 'day' },
			{ key: 'quarter', licensed: maxHistoryInDays >= 90, granularity: 'week' },
			{ key: 'year', licensed: maxHistoryInDays >= 365, granularity: 'week' },
		];
	}
}
