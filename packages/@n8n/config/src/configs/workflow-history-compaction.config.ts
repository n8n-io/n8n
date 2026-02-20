import { Config, Env } from '../decorators';

/**
 * Controls behavior of workflow-history-compaction service
 *
 * Note this service both _compacts_ extraneous recent versions
 * and _trims_ older versions, aiming for sustainable long term
 * storage management.
 */
@Config
export class WorkflowHistoryCompactionConfig {
	@Env('N8N_WORKFLOW_HISTORY_OPTIMIZING_MINIMUM_AGE_HOURS')
	/**
	 * The minimum time we leave workflows in the history untouched
	 * before we start optimizing them.
	 *
	 * The workflow versions we compare and compact are those with
	 * a `createdAt` value between `optimizingMinimumAgeHours - optimizingTimeWindowHours`
	 * and `optimizingMinimumAgeHours`

	 */
	optimizingMinimumAgeHours: number = 0.25;

	/**
	 * The time window we consider when optimizing versions.
	 *
	 * The workflow versions we compare and optimize are those with
	 * a `createdAt` value between `optimizationMinimumAgeHours - optimizationTimeWindowHours`
	 * and `optimizationMinimumAgeHours`.
	 *
	 * Optimization will happen every `optimizingTimeWindowHours/2` hours to
	 * account for small gaps and downtime.
	 */
	@Env('N8N_WORKFLOW_HISTORY_OPTIMIZING_TIME_WINDOW_HOURS')
	optimizingTimeWindowHours: number = 2;

	/**
	 * The minimum time we leave workflows in the history untouched
	 * before we start trimming them.
	 *
	 * The workflow versions we compare and trim are those with
	 * a `createdAt` value between `trimmingMinimumAgeDays - trimmingTimeWindowDays`
	 * and `trimmingMinimumAgeDays`

	 */
	@Env('N8N_WORKFLOW_HISTORY_TRIMMING_MINIMUM_AGE_DAYS')
	trimmingMinimumAgeDays: number = 7;

	/**
	 * The time window we consider when trimming versions.
	 *
	 * The workflow versions we compare and trim are those with
	 * a `createdAt` value between `trimmingMinimumAgeDays - trimmingTimeWindowDays`
	 * and `trimmingMinimumAgeDays`.
	 *
	 * Trimming will happen once a day.
	 */
	@Env('N8N_WORKFLOW_HISTORY_TRIMMING_TIME_WINDOW_DAYS')
	trimmingTimeWindowDays: number = 2;

	/**
	 * The maximum number of compared workflow versions before waiting `batchDelayMs`
	 * before continuing with the next workflowId
	 */
	@Env('N8N_WORKFLOW_HISTORY_COMPACTION_BATCH_SIZE')
	batchSize: number = 100;

	/**
	 * Delay in milliseconds before continuing with the next workflowId to compact
	 * after having compared at least `batchSize` workflow versions
	 */
	@Env('N8N_WORKFLOW_HISTORY_COMPACTION_BATCH_DELAY_MS')
	batchDelayMs: number = 1_000;

	/**
	 * Whether to run trimming on instance start up.
	 *
	 * Useful to apply a larger compaction value to cover existing
	 * histories if something went wrong previously, and for development.
	 *
	 * @warning Long-running blocking operation that will increase startup time.
	 */
	@Env('N8N_WORKFLOW_HISTORY_COMPACTION_TRIM_ON_START_UP')
	trimOnStartUp: boolean = false;
}
