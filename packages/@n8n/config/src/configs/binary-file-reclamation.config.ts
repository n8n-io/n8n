import { Config, Env } from '../decorators';

@Config
export class BinaryFileReclamationConfig {
	@Env('N8N_BINARY_FILE_RECLAMATION_ENABLED')
	enabled: boolean = false;

	/** Maximum size in bytes for the binary data storage directory. When exceeded, oldest execution binary data is deleted until usage drops below the target. 0 = disabled. */
	@Env('N8N_BINARY_FILE_RECLAMATION_MAX_STORAGE_BYTES')
	maxStorageBytes: number = 0;

	/** Target usage fraction of maxStorageBytes to reach during cleanup (0-1). */
	@Env('N8N_BINARY_FILE_RECLAMATION_TARGET_RATIO')
	targetRatio: number = 0.6;

	/** How often (minutes) to check storage usage. */
	@Env('N8N_BINARY_FILE_RECLAMATION_CHECK_INTERVAL_MINUTES')
	checkIntervalMinutes: number = 30;

	/** Executions to process per cleanup batch. */
	@Env('N8N_BINARY_FILE_RECLAMATION_BATCH_SIZE')
	batchSize: number = 100;
}
