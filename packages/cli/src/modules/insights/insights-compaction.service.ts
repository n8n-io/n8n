import { Service } from '@n8n/di';

import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsRawRepository } from './database/repositories/insights-raw.repository';
import { InsightsConfig } from './insights.config';

/**
 * This service is responsible for compacting lower granularity insights data
 * into higher granularity to control the size of the insights data.
 */
@Service()
export class InsightsCompactionService {
	private compactInsightsTimer: NodeJS.Timer | undefined;

	constructor(
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly insightsRawRepository: InsightsRawRepository,
		private readonly insightsConfig: InsightsConfig,
	) {}

	startCompactionTimer() {
		this.stopCompactionTimer();
		this.compactInsightsTimer = setInterval(
			async () => await this.compactInsights(),
			this.insightsConfig.compactionIntervalMinutes * 60 * 1000,
		);
	}

	stopCompactionTimer() {
		if (this.compactInsightsTimer !== undefined) {
			clearInterval(this.compactInsightsTimer);
			this.compactInsightsTimer = undefined;
		}
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

	/**
	 * Compacts raw data to hourly aggregates
	 */
	async compactRawToHour() {
		// Build the query to gather raw insights data for the batch
		const batchQuery = this.insightsRawRepository.getRawInsightsBatchQuery(
			this.insightsConfig.compactionBatchSize,
		);

		return await this.insightsByPeriodRepository.compactSourceDataIntoInsightPeriod({
			sourceBatchQuery: batchQuery,
			sourceTableName: this.insightsRawRepository.metadata.tableName,
			periodUnitToCompactInto: 'hour',
		});
	}

	/**
	 * Compacts hourly data to daily aggregates
	 */
	async compactHourToDay() {
		// get hour data query for batching
		const batchQuery = this.insightsByPeriodRepository.getPeriodInsightsBatchQuery({
			periodUnitToCompactFrom: 'hour',
			compactionBatchSize: this.insightsConfig.compactionBatchSize,
			maxAgeInDays: this.insightsConfig.compactionHourlyToDailyThresholdDays,
		});

		return await this.insightsByPeriodRepository.compactSourceDataIntoInsightPeriod({
			sourceBatchQuery: batchQuery,
			periodUnitToCompactInto: 'day',
		});
	}

	/**
	 * Compacts daily data to weekly aggregates
	 */
	async compactDayToWeek() {
		// get daily data query for batching
		const batchQuery = this.insightsByPeriodRepository.getPeriodInsightsBatchQuery({
			periodUnitToCompactFrom: 'day',
			compactionBatchSize: this.insightsConfig.compactionBatchSize,
			maxAgeInDays: this.insightsConfig.compactionDailyToWeeklyThresholdDays,
		});

		return await this.insightsByPeriodRepository.compactSourceDataIntoInsightPeriod({
			sourceBatchQuery: batchQuery,
			periodUnitToCompactInto: 'week',
		});
	}
}
