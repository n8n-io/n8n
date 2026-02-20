export type AgentTaskStep = {
	type: 'agentTaskStep';
	data: {
		agentId: string;
		event: Record<string, unknown>;
	};
};

export type AgentTaskDone = {
	type: 'agentTaskDone';
	data: {
		agentId: string;
		status: string;
		summary?: string;
	};
};

export type AgentTaskPushMessage = AgentTaskStep | AgentTaskDone;
