export interface AgentBackgroundTaskDto {
	id: string;
	title: string;
	/** Source of the background task. */
	kind: 'subagent' | 'workflow';
	status: 'running' | 'completed' | 'failed' | 'cancelled';
	/** ISO timestamp when the background task started. */
	startedAt: string;
}

export interface AgentBackgroundTaskSignal {
	tasks: Array<
		Pick<AgentBackgroundTaskDto, 'id' | 'title' | 'kind'> & {
			status: Exclude<AgentBackgroundTaskDto['status'], 'running'>;
		}
	>;
}

export interface AgentBackgroundTasksResponse {
	/** Jobs in the current group. Empty when no jobs are running. */
	tasks: AgentBackgroundTaskDto[];
}
