import { Config, Env } from '../decorators';

@Config
export class BinaryDataPruningConfig {
	/** Max disk usage in MiB for binary data. 0 = pruning disabled. */
	@Env('N8N_BINARY_DATA_STORAGE_QUOTA_MIB')
	quotaMiB: number = 0;

	/** Minutes between pruning checks. */
	@Env('N8N_BINARY_DATA_PRUNING_INTERVAL')
	intervalMinutes: number = 60;

	/** Max execution dirs to delete per pruning pass. */
	@Env('N8N_BINARY_DATA_PRUNING_BATCH_SIZE')
	batchSize: number = 100;
}
