import { Config, Env } from '@n8n/config/src/decorators';

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
}
