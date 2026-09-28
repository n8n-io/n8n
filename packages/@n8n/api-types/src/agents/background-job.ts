export interface AgentBackgroundJobDto {
	id: string;
	title: string;
	/** Source of the background job. */
	kind: 'subagent' | 'workflow';
	status: 'running' | 'completed' | 'failed' | 'cancelled';
	/** ISO timestamp when the background job started. */
	startedAt: string;
	/** ISO timestamp when the background job reached a terminal status. */
	settledAt?: string;
}

export interface AgentBackgroundJobSignal {
	tasks: Array<
		Pick<AgentBackgroundJobDto, 'id' | 'title' | 'kind'> & {
			status: Exclude<AgentBackgroundJobDto['status'], 'running'>;
		}
	>;
}

export interface AgentBackgroundJobsResponse {
	/** Jobs in the current group while jobs run or results await delivery. */
	tasks: AgentBackgroundJobDto[];
	/** Terminal jobs whose results the parent has not consumed. */
	pendingTaskIds?: string[];
}
