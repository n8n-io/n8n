import { type InsightsSummary } from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { DateTime } from 'luxon';
import { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';

import type { PeriodUnit, TypeUnit } from './database/entities/insights-shared';
import { NumberToType, TypeToNumber } from './database/entities/insights-shared';
import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsCollectionService } from './insights-collection.service';
import { InsightsCompactionService } from './insights-compaction.service';
import { InsightsPruningService } from './insights-pruning.service';
import { INSIGHTS_DATE_RANGE_KEYS, keyRangeToDays } from './insights.constants';

@Service()
export class InsightsService {
	constructor(
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly compactionService: InsightsCompactionService,
		private readonly collectionService: InsightsCollectionService,
		private readonly pruningService: InsightsPruningService,
		private readonly licenseState: LicenseState,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('insights');
	}

	settings() {
		return {
			summary: this.licenseState.isInsightsSummaryLicensed(),
			dashboard: this.licenseState.isInsightsDashboardLicensed(),
			/**
			 * @deprecated the frontend should not rely on this anymore since users can select custom ranges
			 */
			dateRanges: this.getAvailableDateRanges(),
		};
	}

	startTimers() {
		this.collectionService.startFlushingTimer();

		if (this.instanceSettings.isLeader) this.startCompactionAndPruningTimers();
	}

	@OnLeaderTakeover()
	startCompactionAndPruningTimers() {
		this.compactionService.startCompactionTimer();
		if (this.pruningService.isPruningEnabled) {
			this.pruningService.startPruningTimer();
		}
	}

	@OnLeaderStepdown()
	stopCompactionAndPruningTimers() {
		this.compactionService.stopCompactionTimer();
		this.pruningService.stopPruningTimer();
	}

	async shutdown() {
		await this.collectionService.shutdown();
		this.stopCompactionAndPruningTimers();
	}

	async getInsightsSummary({
		startDate,
		endDate,
		projectId,
	}: {
		projectId?: string;
		startDate: Date;
		endDate: Date;
	}): Promise<InsightsSummary> {
		const rows = await this.insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates({
			startDate,
			endDate,
			projectId,
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
		skip = 0,
		take = 10,
		sortBy = 'total:desc',
		projectId,
		startDate,
		endDate,
	}: {
		skip?: number;
		take?: number;
		sortBy?: string;
		projectId?: string;
		startDate: Date;
		endDate: Date;
	}) {
		const { count, rows } = await this.insightsByPeriodRepository.getInsightsByWorkflow({
			startDate,
			endDate,
			skip,
			take,
			sortBy,
			projectId,
		});

		return {
			count,
			data: rows,
		};
	}

	async getInsightsByTime({
		// Default to all insight types
		insightTypes = Object.keys(TypeToNumber) as TypeUnit[],
		projectId,
		startDate,
		endDate,
	}: {
		insightTypes?: TypeUnit[];
		projectId?: string;
		startDate: Date;
		endDate: Date;
	}) {
		const periodUnit = this.getDateFiltersGranularity({ startDate, endDate });
		const rows = await this.insightsByPeriodRepository.getInsightsByTime({
			periodUnit,
			insightTypes,
			projectId,
			startDate,
			endDate,
		});

		return rows.map((r) => {
			const { periodStart, runTime, ...rest } = r;
			const values: typeof rest & {
				total?: number;
				successRate?: number;
				failureRate?: number;
				averageRunTime?: number;
			} = rest;

			// Compute ratio if total has been computed
			if (typeof r.succeeded === 'number' && typeof r.failed === 'number') {
				const total = r.succeeded + r.failed;
				values.total = total;
				values.failureRate = total ? r.failed / total : 0;
				if (typeof runTime === 'number') {
					values.averageRunTime = total ? runTime / total : 0;
				}
			}
			return {
				date: r.periodStart,
				values,
			};
		});
	}

	/**
	 * Checks if the selected date range is compliant with the license
	 *
	 * - If the granularity is 'hour', checks if the license allows hourly data access
	 * - Checks if the start date is within the allowed history range
	 *
	 * @throws {UserError} if the license does not allow the selected date range
	 */
	validateDateFiltersLicense({ startDate, endDate }: { startDate: Date; endDate: Date }) {
		// we use `startOf('day')` because the license limits are based on full days
		const today = DateTime.now().startOf('day');
		const startDateStartOfDay = DateTime.fromJSDate(startDate).startOf('day');
		const daysToStartDate = today.diff(startDateStartOfDay, 'days').days;

		const granularity = this.getDateFiltersGranularity({ startDate, endDate });

		const maxHistoryInDays =
			this.licenseState.getInsightsMaxHistory() === -1
				? Number.MAX_SAFE_INTEGER
				: this.licenseState.getInsightsMaxHistory();
		const isHourlyDateLicensed = this.licenseState.isInsightsHourlyDataLicensed();

		if (granularity === 'hour' && !isHourlyDateLicensed) {
			throw new UserError('Hourly data is not available with your current license');
		}

		if (maxHistoryInDays < daysToStartDate) {
			throw new UserError(
				'The selected date range exceeds the maximum history allowed by your license',
			);
		}
	}

	private getDateFiltersGranularity({
		startDate,
		endDate,
	}: { startDate: Date; endDate: Date }): PeriodUnit {
		const startDateTime = DateTime.fromJSDate(startDate);
		const endDateTime = DateTime.fromJSDate(endDate);
		const differenceInDays = endDateTime.diff(startDateTime, 'days').days;

		if (differenceInDays < 1) {
			return 'hour';
		}

		if (differenceInDays <= 30) {
			return 'day';
		}

		return 'week';
	}

	/**
	 * @deprecated Users can now select custom date ranges
	 * Returns the available date ranges with their license authorization and time granularity
	 * when grouped by time.
	 */
	getAvailableDateRanges(): DateRange[] {
		const maxHistoryInDays =
			this.licenseState.getInsightsMaxHistory() === -1
				? Number.MAX_SAFE_INTEGER
				: this.licenseState.getInsightsMaxHistory();
		const isHourlyDateLicensed = this.licenseState.isInsightsHourlyDataLicensed();

		return INSIGHTS_DATE_RANGE_KEYS.map((key) => ({
			key,
			licensed:
				key === 'day' ? (isHourlyDateLicensed ?? false) : maxHistoryInDays >= keyRangeToDays[key],
			granularity: key === 'day' ? 'hour' : keyRangeToDays[key] <= 30 ? 'day' : 'week',
		}));
	}
}

type DateRange = {
	key: 'day' | 'week' | '2weeks' | 'month' | 'quarter' | '6months' | 'year';
	licensed: boolean;
	granularity: 'hour' | 'day' | 'week';
};
