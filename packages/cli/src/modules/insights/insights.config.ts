import { Config, Env } from '@n8n/config';

@Config
export class InsightsConfig {
	/**
	 * The interval in minutes at which the insights data should be compacted.
	 * Default: 60
	 */
	@Env('N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES')
	compactionIntervalMinutes: number = 60;

	/**
	 * The number of raw insights data to compact in a single batch.
	 * Default: 500
	 */
	@Env('N8N_INSIGHTS_COMPACTION_BATCH_SIZE')
	compactionBatchSize: number = 500;

	/**
	 * The max age in days of hourly insights data to compact.
	 * Default: 90
	 */
	@Env('N8N_INSIGHTS_COMPACTION_HOURLY_TO_DAILY_THRESHOLD_DAYS')
	compactionHourlyToDailyThresholdDays: number = 90;

	/**
	 * The max age in days of daily insights data to compact.
	 * Default: 180
	 */
	@Env('N8N_INSIGHTS_COMPACTION_DAILY_TO_WEEKLY_THRESHOLD_DAYS')
	compactionDailyToWeeklyThresholdDays: number = 180;

	/**
	 * The maximum number of insights data to keep in the buffer before flushing.
	 * Default: 1000
	 */
	@Env('N8N_INSIGHTS_FLUSH_BATCH_SIZE')
	flushBatchSize: number = 1000;

	/**
	 * The interval in seconds at which the insights data should be flushed to the database.
	 * Default: 30
	 */
	@Env('N8N_INSIGHTS_FLUSH_INTERVAL_SECONDS')
	flushIntervalSeconds: number = 30;

	/**
	 * How old (days) insights data must be to qualify for regular deletion
	 * Default: -1 (no pruning)
	 */
	@Env('N8N_INSIGHTS_MAX_AGE_DAYS')
	maxAgeDays: number = -1;

	/**
	 * How often (hours) insights data will be checked for regular deletion.
	 * Default: 24
	 */
	@Env('N8N_INSIGHTS_PRUNE_CHECK_INTERVAL_HOURS')
	pruneCheckIntervalHours: number = 24;
}
