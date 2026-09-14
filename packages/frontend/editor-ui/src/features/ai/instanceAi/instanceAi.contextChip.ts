type ContextChipBase = {
	label: string;
	icon?: string;
	testId?: string;
};

export type AgentArtifactContextChip = ContextChipBase & {
	type: 'agent-artifact';
	agentId: string;
	projectId: string;
	isNewAgent: boolean;
};

export type AgentPreviewSessionContextChip = ContextChipBase & {
	type: 'agent-preview-session';
	agentId: string;
	threadId: string;
	executionId?: string;
};

export type ContextChip = AgentArtifactContextChip | AgentPreviewSessionContextChip;
