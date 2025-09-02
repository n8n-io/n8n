import { Config, Env } from '../decorators';

@Config
export class DataTableConfig {
	/** Specifies the maximum allowed size (in megabytes) for data tables. */
	@Env('N8N_DATA_TABLES_MAX_SIZE_MB')
	maxSize: number = 100;

	/**
	 * The percentage threshold at which a warning is triggered for data tables.
	 * When the usage of a data table reaches or exceeds this value, a warning is issued.
	 */
	@Env('N8N_DATA_TABLES_WARNING_THRESHOLD_PERCENTAGE')
	warningThreshold: number = 95;
}
