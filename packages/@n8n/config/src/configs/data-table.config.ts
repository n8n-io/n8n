import { Config, Env } from '../decorators';

@Config
export class DataTableConfig {
	/** Specifies the maximum allowed size (in bytes) for data tables. */
	@Env('N8N_DATA_TABLES_MAX_SIZE_BYTES')
	maxSize: number = 100 * 1024 * 1024;

	/**
	 * The percentage threshold at which a warning is triggered for data tables.
	 * When the usage of a data table reaches or exceeds this value, a warning is issued.
	 */
	@Env('N8N_DATA_TABLES_WARNING_THRESHOLD_BYTES')
	warningThreshold: number = 95 * 1024 * 1024;

	/**
	 * The duration in milliseconds for which the data table size is cached.
	 * This prevents excessive database queries for size validation.
	 */
	@Env('N8N_DATA_TABLES_SIZE_CHECK_CACHE_DURATION_MS')
	sizeCheckCacheDuration: number = 5 * 1000;
}
