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
export class ExecutionsConfig {
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
}
