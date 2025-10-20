import { Config, Env, Nested } from '../decorators';

@Config
class PruningIntervalsConfig {
	/** How often (minutes) execution data should be hard-deleted. */
	@Env('EXECUTIONS_DATA_PRUNE_HARD_DELETE_INTERVAL')
	hardDelete: number = 15;

	/** How often (minutes) execution data should be soft-deleted. */
	@Env('EXECUTIONS_DATA_PRUNE_SOFT_DELETE_INTERVAL')
	softDelete: number = 60;
}

@Config
class ConcurrencyConfig {
	/**
	 * Max production executions allowed to run concurrently. `-1` means unlimited.
	 *
	 * Default for scaling mode is taken from the worker's `--concurrency` flag.
	 */
	@Env('N8N_CONCURRENCY_PRODUCTION_LIMIT')
	productionLimit: number = -1;

	/** Max evaluation executions allowed to run concurrently. `-1` means unlimited. */
	@Env('N8N_CONCURRENCY_EVALUATION_LIMIT')
	evaluationLimit: number = -1;
}

@Config
class QueueRecoveryConfig {
	/** How often (minutes) to check for queue recovery. */
	@Env('N8N_EXECUTIONS_QUEUE_RECOVERY_INTERVAL')
	interval: number = 180;

	/** Size of batch of executions to check for queue recovery. */
	@Env('N8N_EXECUTIONS_QUEUE_RECOVERY_BATCH')
	batchSize: number = 100;
}

@Config
export class ExecutionsConfig {
	/**
	 * How long (seconds) a workflow execution may run for before timeout.
	 * On timeout, the execution will be forcefully stopped. `-1` for unlimited.
	 * Currently unlimited by default - this default will change in a future version.
	 */
	@Env('EXECUTIONS_TIMEOUT')
	timeout: number = -1;

	/** How long (seconds) a workflow execution may run for at most. */
	@Env('EXECUTIONS_TIMEOUT_MAX')
	maxTimeout: number = 3600; // 1h

	/** Whether to delete past executions on a rolling basis. */
	@Env('EXECUTIONS_DATA_PRUNE')
	pruneData: boolean = true;

	/** How old (hours) a finished execution must be to qualify for soft-deletion. */
	@Env('EXECUTIONS_DATA_MAX_AGE')
	pruneDataMaxAge: number = 336;

	/**
	 * Max number of finished executions to keep in database. Does not necessarily
	 * prune to the exact max number. `0` for unlimited.
	 */
	@Env('EXECUTIONS_DATA_PRUNE_MAX_COUNT')
	pruneDataMaxCount: number = 10_000;

	/**
	 * How old (hours) a finished execution must be to qualify for hard-deletion.
	 * This buffer by default excludes recent executions as the user may need
	 * them while building a workflow.
	 */
	@Env('EXECUTIONS_DATA_HARD_DELETE_BUFFER')
	pruneDataHardDeleteBuffer: number = 1;

	@Nested
	pruneDataIntervals: PruningIntervalsConfig;

	@Nested
	concurrency: ConcurrencyConfig;

	@Nested
	queueRecovery: QueueRecoveryConfig;

	/** Whether to save execution data for failed production executions. This default can be overridden at a workflow level. */
	@Env('EXECUTIONS_DATA_SAVE_ON_ERROR')
	saveDataOnError: 'all' | 'none' = 'all';

	/** Whether to save execution data for successful production executions. This default can be overridden at a workflow level. */
	@Env('EXECUTIONS_DATA_SAVE_ON_SUCCESS')
	saveDataOnSuccess: 'all' | 'none' = 'all';

	/** Whether to save execution data as each node executes. This default can be overridden at a workflow level. */
	@Env('EXECUTIONS_DATA_SAVE_ON_PROGRESS')
	saveExecutionProgress: boolean = false;

	/** Whether to save execution data for manual executions. This default can be overridden at a workflow level. */
	@Env('EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS')
	saveDataManualExecutions: boolean = true;
}
