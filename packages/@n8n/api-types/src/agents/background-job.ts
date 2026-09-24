import type { AgentBuilderOpenSuspension } from './types';

export interface AgentBackgroundJobDto {
	id: string;
	title: string;
	/** Source of the background job. */
	kind: 'subagent' | 'workflow';
	status: 'running' | 'suspended' | 'completed' | 'failed' | 'cancelled';
	/** The next approval for this child. The parent conversation remains available. */
	approval?: AgentBuilderOpenSuspension;
	/** ISO timestamp when the background job started. */
	startedAt: string;
	/** ISO timestamp when the background job reached a terminal status. */
	settledAt?: string;
}

export interface AgentBackgroundJobSignal {
	tasks: Array<
		Pick<AgentBackgroundJobDto, 'id' | 'title' | 'kind'> & {
			status: Exclude<AgentBackgroundJobDto['status'], 'running' | 'suspended'>;
		}
	>;
}

export interface AgentBackgroundJobsResponse {
	/** Jobs in the current group while jobs run or results await delivery. */
	tasks: AgentBackgroundJobDto[];
	/** Terminal jobs whose results the parent has not consumed. */
	pendingTaskIds?: string[];
}
