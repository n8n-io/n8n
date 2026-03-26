import { Config, Env } from '../decorators';

@Config
export class BinaryFileReclamationConfig {
	@Env('N8N_BINARY_FILE_RECLAMATION_ENABLED')
	enabled: boolean = false;

	/** Total disk budget in bytes. 0 = disabled. */
	@Env('N8N_BINARY_FILE_RECLAMATION_MAX_STORAGE_BYTES')
	maxStorageBytes: number = 0;

	/** Start cleanup when usage exceeds this fraction of maxStorageBytes. */
	@Env('N8N_BINARY_FILE_RECLAMATION_HIGH_WATERMARK')
	highWatermark: number = 0.8;

	/** Stop cleanup when usage drops below this fraction. */
	@Env('N8N_BINARY_FILE_RECLAMATION_LOW_WATERMARK')
	lowWatermark: number = 0.6;

	/** How often (minutes) to check storage usage. */
	@Env('N8N_BINARY_FILE_RECLAMATION_CHECK_INTERVAL_MINUTES')
	checkIntervalMinutes: number = 30;

	/** Executions to process per cleanup batch. */
	@Env('N8N_BINARY_FILE_RECLAMATION_BATCH_SIZE')
	batchSize: number = 100;

	/** Delay (ms) between batches to avoid blocking. */
	@Env('N8N_BINARY_FILE_RECLAMATION_BATCH_DELAY_MS')
	batchDelayMs: number = 500;
}
