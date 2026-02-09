import { Config, Env } from '@n8n/config';

@Config
export class ExecutionQuotaModuleConfig {
	/** Maximum number of counter increments to buffer before flushing to DB */
	@Env('N8N_EXECUTION_QUOTA_FLUSH_BATCH_SIZE')
	flushBatchSize: number = 500;

	/** Interval in seconds between counter flush operations */
	@Env('N8N_EXECUTION_QUOTA_FLUSH_INTERVAL_SECONDS')
	flushIntervalSeconds: number = 30;

	/** How often (in hours) to prune old counter data */
	@Env('N8N_EXECUTION_QUOTA_PRUNE_INTERVAL_HOURS')
	pruneIntervalHours: number = 24;

	/** How many months of counter data to retain */
	@Env('N8N_EXECUTION_QUOTA_RETENTION_MONTHS')
	retentionMonths: number = 3;

	/** How long (in minutes) to cache quota configs in memory */
	@Env('N8N_EXECUTION_QUOTA_CACHE_TTL_MINUTES')
	cacheTtlMinutes: number = 1;
}
