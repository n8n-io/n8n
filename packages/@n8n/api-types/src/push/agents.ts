export type AgentExecutionUpdated = {
	type: 'agentExecutionUpdated';
	data: {
		projectId: string;
		agentId: string;
		threadId: string;
		executionId: string;
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
