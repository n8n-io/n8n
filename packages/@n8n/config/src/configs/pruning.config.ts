import { Config, Env } from '../decorators';

@Config
export class PruningConfig {
	/** Whether to delete past executions on a rolling basis. */
	@Env('EXECUTIONS_DATA_PRUNE')
	isEnabled: boolean = true;

	/** How old (hours) a finished execution must be to qualify for soft-deletion. */
	@Env('EXECUTIONS_DATA_MAX_AGE')
	maxAge: number = 336;

	/**
	 * Max number of finished executions to keep in database. Does not necessarily
	 * prune to the exact max number. `0` for unlimited.
	 */
	@Env('EXECUTIONS_DATA_PRUNE_MAX_COUNT')
	maxCount: number = 10_000;

	/**
	 * How old (hours) a finished execution must be to qualify for hard-deletion.
	 * This buffer by default excludes recent executions as the user may need
	 * them while building a workflow.
	 */
	@Env('EXECUTIONS_DATA_HARD_DELETE_BUFFER')
	hardDeleteBuffer: number = 1;

	/** How often (minutes) execution data should be hard-deleted. */
	@Env('EXECUTIONS_DATA_PRUNE_HARD_DELETE_INTERVAL')
	hardDeleteInterval: number = 15;

	/** How often (minutes) execution data should be soft-deleted */
	@Env('EXECUTIONS_DATA_PRUNE_SOFT_DELETE_INTERVAL')
	softDeleteInterval: number = 60;
}
