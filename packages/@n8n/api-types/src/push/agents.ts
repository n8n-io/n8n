export type AgentExecutionUpdated = {
	type: 'agentExecutionUpdated';
	data: {
		projectId: string;
		agentId: string;
		threadId: string;
		executionId: string;
		status?: 'running' | 'success' | 'error' | 'cancelled' | 'interrupted';
	};
};

export type AgentUpdated = {
	type: 'agentUpdated';
	data: {
		projectId: string;
		agentId: string;
	};
};

export type AgentsPushMessage = AgentExecutionUpdated | AgentUpdated;
