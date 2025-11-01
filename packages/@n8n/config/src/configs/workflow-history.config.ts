import { Config, Env } from '../decorators';

@Config
export class WorkflowHistoryConfig {
	/** Whether to save workflow history versions. */
	@Env('N8N_WORKFLOW_HISTORY_ENABLED')
	enabled: boolean = true;

	/** Time (in hours) to keep workflow history versions for. `-1` means forever. */
	@Env('N8N_WORKFLOW_HISTORY_PRUNE_TIME')
	pruneTime: number = -1;
}
