export interface AgentBackgroundTaskDto {
	id: string;
	title: string;
	/** Source of the background task. */
	kind: 'subagent' | 'workflow';
	status: 'running' | 'completed' | 'failed' | 'cancelled';
	/** ISO timestamp when the background task started. */
	startedAt: string;
	/** ISO timestamp when the background task reached a terminal status. */
	settledAt?: string;
}

export interface AgentBackgroundTaskSignal {
	tasks: Array<
		Pick<AgentBackgroundTaskDto, 'id' | 'title' | 'kind'> & {
			status: Exclude<AgentBackgroundTaskDto['status'], 'running'>;
		}
	>;
}

export interface AgentBackgroundTasksResponse {
	/** Jobs in the current group while tasks run or results await delivery. */
	tasks: AgentBackgroundTaskDto[];
	/** Terminal jobs whose results the parent has not consumed. */
	pendingTaskIds?: string[];
}
