import type { AgentPlanTaskRef } from './task-cancellation';

import type { AgentBuilderOpenSuspension, AgentToolOutputFile } from './types';

export interface AgentBackgroundJobDto {
	planTask?: AgentPlanTaskRef;
	id: string;
	title: string;
	/** Source of the background job. */
	kind: 'subagent' | 'workflow';
	status: 'running' | 'suspended' | 'paused' | 'completed' | 'failed' | 'cancelled';
	/** The task belongs to a user stop request. */
	pauseRequested?: boolean;
	/** The next approval for this child. The parent conversation remains available. */
	approval?: AgentBuilderOpenSuspension;
	/** ISO timestamp when the background job started. */
	startedAt: string;
	/** ISO timestamp when the background job reached a terminal status. */
	settledAt?: string;
	/** Files that the job returned. The session log shows them as thumbnails. */
	files?: AgentToolOutputFile[];
}

export interface AgentBackgroundJobSignal {
	/** No background results or unfinished plan tasks remain when this turn starts. */
	isFinal?: boolean;
	tasks: Array<
		Pick<AgentBackgroundJobDto, 'id' | 'title' | 'kind'> & {
			status: Exclude<AgentBackgroundJobDto['status'], 'running' | 'suspended' | 'paused'>;
			/** Files that the job returned. The chat shows them as thumbnails. */
			files?: AgentToolOutputFile[];
		}
	>;
}

export interface AgentBackgroundJobsResponse {
	/** Jobs in the current group while jobs run or results await delivery. */
	tasks: AgentBackgroundJobDto[];
	/** Terminal jobs whose results the parent has not consumed. */
	pendingTaskIds?: string[];
}
