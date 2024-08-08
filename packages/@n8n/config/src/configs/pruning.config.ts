import { Config, Env, Nested } from '../decorators';

@Config
class SizeBasedPruningConfig {
	/** Whether to regularly delete old files from `N8N_BINARY_DATA_STORAGE_PATH` when the dir exceeds a max size. Requires `N8N_DEFAULT_BINARY_DATA_MODE` to be `filesystem`. */
	@Env('N8N_SIZE_BASED_PRUNING_ENABLED')
	isEnabled = true;

	/** Max size (in bytes) allowed for the target dir. May be exceeded if size-based pruning is not frequent enough. */
	@Env('N8N_SIZE_BASED_PRUNING_MAX_DIR_SIZE')
	maxSize = 1024 * 1024 * 1024; // 1 GiB

	/** Ratio of max dir size to come back down to after a size-based pruning cycle. */
	@Env('N8N_SIZE_BASED_PRUNING_TARGET_RATIO')
	targetRatio = 0.8;

	/** How often (in milliseconds) to prune the target dir based on size. */
	@Env('N8N_SIZE_BASED_PRUNING_FREQUENCY')
	frequency = 60 * 60 * 1000; // 1 hour
}

@Config
export class PruningConfig {
	@Nested
	bySize: SizeBasedPruningConfig;
}
