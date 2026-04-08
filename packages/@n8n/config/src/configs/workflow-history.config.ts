import { Config, Env } from '../decorators';

@Config
export class WorkflowHistoryConfig {
	/** How long in hours to keep workflow history versions before pruning. Use `-1` to keep forever. */
	@Env('N8N_WORKFLOW_HISTORY_PRUNE_TIME')
	pruneTime: number = -1;
}
