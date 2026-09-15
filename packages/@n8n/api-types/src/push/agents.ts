export type AgentExecutionUpdated = {
	type: 'agentExecutionUpdated';
	data: {
		projectId: string;
		agentId: string;
		threadId: string;
		executionId: string;
		/** Present for queue transitions that affect optimistic client state. */
		executionStatus?: 'queued' | 'running' | 'error';
	};
};

export type AgentBackgroundJobsUpdated = {
	type: 'agentBackgroundTasksUpdated';
	data: {
		projectId: string;
		agentId: string;
		threadId: string;
	};
};

export type AgentUpdated = {
	type: 'agentUpdated';
	data: {
		projectId: string;
		agentId: string;
	};
};

export type AgentsPushMessage = AgentExecutionUpdated | AgentUpdated | AgentBackgroundJobsUpdated;
