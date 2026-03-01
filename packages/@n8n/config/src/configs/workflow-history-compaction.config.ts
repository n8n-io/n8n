import { Config, Env } from '../decorators';

/**
 * Config for the workflow history compaction service, which compacts recent versions and trims old ones to manage storage.
 */
@Config
export class WorkflowHistoryCompactionConfig {
	/**
	 * Minimum age in hours before a workflow version is eligible for optimization.
	 * Versions compacted are those with `createdAt` between `optimizingMinimumAgeHours - optimizingTimeWindowHours` and `optimizingMinimumAgeHours`.
	 */
	@Env('N8N_WORKFLOW_HISTORY_OPTIMIZING_MINIMUM_AGE_HOURS')
	optimizingMinimumAgeHours: number = 0.25;

	/**
	 * Time window in hours used when selecting versions to optimize.
	 * Optimization runs roughly every `optimizingTimeWindowHours / 2` hours.
	 */
	@Env('N8N_WORKFLOW_HISTORY_OPTIMIZING_TIME_WINDOW_HOURS')
	optimizingTimeWindowHours: number = 2;

	/**
	 * Minimum age in days before a workflow version is eligible for trimming.
	 * Versions trimmed are those with `createdAt` between `trimmingMinimumAgeDays - trimmingTimeWindowDays` and `trimmingMinimumAgeDays`.
	 */
	@Env('N8N_WORKFLOW_HISTORY_TRIMMING_MINIMUM_AGE_DAYS')
	trimmingMinimumAgeDays: number = 7;

	/**
	 * Time window in days used when selecting versions to trim. Trimming runs once per day.
	 */
	@Env('N8N_WORKFLOW_HISTORY_TRIMMING_TIME_WINDOW_DAYS')
	trimmingTimeWindowDays: number = 2;

	/** Maximum number of workflow versions to process per workflow before waiting `batchDelayMs` before the next workflow. */
	@Env('N8N_WORKFLOW_HISTORY_COMPACTION_BATCH_SIZE')
	batchSize: number = 100;

	/** Delay in milliseconds after processing `batchSize` versions before moving to the next workflow. */
	@Env('N8N_WORKFLOW_HISTORY_COMPACTION_BATCH_DELAY_MS')
	batchDelayMs: number = 1_000;

	/**
	 * Whether to run a trim pass on startup (for example, to fix existing history or for development).
	 *
	 * @warning Blocking; can significantly increase startup time.
	 */
	@Env('N8N_WORKFLOW_HISTORY_COMPACTION_TRIM_ON_START_UP')
	trimOnStartUp: boolean = false;
}
