import { Config, Env } from '../decorators';

@Config
export class WorkflowHistoryCompactionConfig {
	@Env('N8N_WORKFLOW_HISTORY_COMPACTION_MINIMUM_AGE_HOURS')
	/**
	 * The minimum time we leave workflows in the history untouched
	 * before we start compacting them.
	 *
	 * The workflow versions we compare and compact are those with
	 * a `createdAt` value between `compactingMinimumAgeHours - compactingTimeWindowHours`
	 * and `compactingMinimumAgeHours`

	 */
	compactingMinimumAgeHours: number = 3;

	/**
	 * The time window we consider when compacting versions.
	 *
	 * The workflow versions we compare and compact are those with
	 * a `createdAt` value between `compactingMinimumAgeHours - compactingTimeWindowHours`
	 * and `compactingMinimumAgeHours`.
	 *
	 * Compaction will happen every `compactingTimeWindowHours/2` hours to
	 * account for small gaps and downtime.
	 */
	@Env('N8N_WORKFLOW_HISTORY_COMPACTION_TIME_WINDOW_HOURS')
	compactingTimeWindowHours: number = 2;

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
	 * Whether to run compaction on instance start up.
	 *
	 * Useful to apply a larger compaction value to cover existing
	 * histories if something went wrong previously, and for development.
	 *
	 * @warning Long-running blocking operation that will increase startup time.
	 */
	@Env('N8N_WORKFLOW_HISTORY_COMPACTION_RUN_ON_START_UP')
	compactOnStartUp: boolean = false;

	/**
	 * The minimum time in milliseconds before two consecutive versions are
	 * considered part of different sessions and should thus never be merged together.
	 */
	@Env('N8N_WORKFLOW_HISTORY_COMPACTION_MINIMUM_TIME_BETWEEN_SESSIONS_MS')
	minimumTimeBetweenSessionsMs: number = 20 * 60 * 1000;
}
