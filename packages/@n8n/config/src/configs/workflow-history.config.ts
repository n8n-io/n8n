import { Config, Env } from '../decorators';

@Config
export class WorkflowHistoryConfig {
	/** Time (in hours) to keep workflow history versions for. `-1` means forever. */
	@Env('N8N_WORKFLOW_HISTORY_PRUNE_TIME')
	pruneTime: number = -1;
}
