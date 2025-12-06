import { Config, Env } from '../decorators';

@Config
export class DataTableConfig {
	/** Specifies the maximum allowed size (in bytes) for data tables. */
	@Env('N8N_DATA_TABLES_MAX_SIZE_BYTES')
	maxSize: number = 50 * 1024 * 1024;

	/**
	 * The percentage threshold at which a warning is triggered for data tables.
	 * When the usage of a data table reaches or exceeds this value, a warning is issued.
	 * Defaults to 80% of maxSize if not explicitly set via environment variable.
	 */
	@Env('N8N_DATA_TABLES_WARNING_THRESHOLD_BYTES')
	warningThreshold?: number;

	/**
	 * The duration in milliseconds for which the data table size is cached.
	 * This prevents excessive database queries for size validation.
	 * Increased from 60s to 10 minutes to reduce load on large deployments.
	 */
	@Env('N8N_DATA_TABLES_SIZE_CHECK_CACHE_DURATION_MS')
	sizeCheckCacheDuration: number = 10 * 60 * 1000; // 10 minutes

	/**
	 * Disable expensive pg_relation_size() queries entirely.
	 * When true, size checks will always return 0 bytes (no limits enforced).
	 * Useful for very large deployments with 100+ tables.
	 */
	@Env('N8N_DATA_TABLES_SIZE_CHECK_DISABLE')
	sizeCheckDisabled: boolean = false;
}
