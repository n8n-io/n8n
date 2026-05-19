import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { sleep } from 'n8n-workflow';

import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsRawRepository } from './database/repositories/insights-raw.repository';
import { InsightsConfig } from './insights.config';

type CompactionRunState = {
	startedAt: number;
	batchesProcessed: number;
	rowsCompacted: number;
};

type CompactionStopReason = 'max-batches' | 'max-runtime';

/**
 * This service is responsible for compacting lower granularity insights data
 * into higher granularity to control the size of the insights data.
 */
@Service()
export class InsightsCompactionService {
	private compactInsightsTimer: NodeJS.Timeout | undefined;

	private isCompactionRunning = false;

	constructor(
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly insightsRawRepository: InsightsRawRepository,
		private readonly insightsConfig: InsightsConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('insights');
	}

	startCompactionTimer() {
		this.stopCompactionTimer();
		this.compactInsightsTimer = setInterval(
			async () => await this.compactInsights(),
			this.insightsConfig.compactionIntervalMinutes * 60 * 1000,
		);
		this.logger.debug('Started compaction timer');
	}

	stopCompactionTimer() {
		if (this.compactInsightsTimer !== undefined) {
			clearInterval(this.compactInsightsTimer);
			this.compactInsightsTimer = undefined;
			this.logger.debug('Stopped compaction timer');
		}
	}

	async compactInsights() {
		if (this.isCompactionRunning) {
			this.logger.debug('Skipping insights compaction because another compaction run is active');
			return;
		}

		this.isCompactionRunning = true;

		try {
			const runState: CompactionRunState = {
				startedAt: Date.now(),
				batchesProcessed: 0,
				rowsCompacted: 0,
			};

			const stoppedAfterRawToHour = await this.compactStage({
				stageName: 'raw-to-hour',
				beforeBatchMessage: 'Compacting raw data to hourly aggregates',
				afterBatchMessage: (rowsCompacted) =>
					`Compacted ${rowsCompacted} raw data to hourly aggregates`,
				compactBatch: this.compactRawToHour.bind(this),
				runState,
			});
			if (stoppedAfterRawToHour) return;

			const stoppedAfterHourToDay = await this.compactStage({
				stageName: 'hour-to-day',
				beforeBatchMessage: 'Compacting hourly data to daily aggregates',
				afterBatchMessage: (rowsCompacted) =>
					`Compacted ${rowsCompacted} hourly data to daily aggregates`,
				compactBatch: this.compactHourToDay.bind(this),
				runState,
			});
			if (stoppedAfterHourToDay) return;

			await this.compactStage({
				stageName: 'day-to-week',
				beforeBatchMessage: 'Compacting daily data to weekly aggregates',
				afterBatchMessage: (rowsCompacted) =>
					`Compacted ${rowsCompacted} daily data to weekly aggregates`,
				compactBatch: this.compactDayToWeek.bind(this),
				runState,
			});
		} finally {
			this.isCompactionRunning = false;
		}
	}

	private async compactStage({
		stageName,
		beforeBatchMessage,
		afterBatchMessage,
		compactBatch,
		runState,
	}: {
		stageName: string;
		beforeBatchMessage: string;
		afterBatchMessage: (rowsCompacted: number) => string;
		compactBatch: () => Promise<number>;
		runState: CompactionRunState;
	}) {
		let numberOfCompactedData: number;

		do {
			const stopReason = this.getCompactionRunStopReason(runState);
			if (stopReason !== undefined) {
				this.logCompactionRunLimitReached(stopReason, stageName, runState);
				return true;
			}

			this.logger.debug(beforeBatchMessage);
			numberOfCompactedData = await compactBatch();
			this.logger.debug(afterBatchMessage(numberOfCompactedData));

			runState.batchesProcessed++;
			runState.rowsCompacted += numberOfCompactedData;

			const stopReasonAfterBatch = this.getCompactionRunStopReason(runState);
			if (stopReasonAfterBatch !== undefined) {
				this.logCompactionRunLimitReached(stopReasonAfterBatch, stageName, runState);
				return true;
			}

			await this.waitBeforeNextBatchIfFull(numberOfCompactedData);
		} while (numberOfCompactedData === this.insightsConfig.compactionBatchSize);

		return false;
	}

	private getCompactionRunStopReason(
		runState: CompactionRunState,
	): CompactionStopReason | undefined {
		if (
			this.insightsConfig.compactionMaxBatchesPerRun > 0 &&
			runState.batchesProcessed >= this.insightsConfig.compactionMaxBatchesPerRun
		) {
			return 'max-batches';
		}

		if (
			this.insightsConfig.compactionMaxRuntimeSeconds > 0 &&
			Date.now() - runState.startedAt >=
				this.insightsConfig.compactionMaxRuntimeSeconds * Time.seconds.toMilliseconds
		) {
			return 'max-runtime';
		}

		return undefined;
	}

	private logCompactionRunLimitReached(
		reason: CompactionStopReason,
		stageName: string,
		runState: CompactionRunState,
	) {
		this.logger.warn('Stopping insights compaction because a per-run limit was reached', {
			reason,
			stageName,
			batchesProcessed: runState.batchesProcessed,
			rowsCompacted: runState.rowsCompacted,
			compactionMaxBatchesPerRun: this.insightsConfig.compactionMaxBatchesPerRun,
			compactionMaxRuntimeSeconds: this.insightsConfig.compactionMaxRuntimeSeconds,
		});
	}

	private async waitBeforeNextBatchIfFull(numberOfCompactedData: number) {
		if (
			numberOfCompactedData !== this.insightsConfig.compactionBatchSize ||
			this.insightsConfig.compactionBatchDelayMilliseconds <= 0
		) {
			return;
		}

		await sleep(this.insightsConfig.compactionBatchDelayMilliseconds);
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
