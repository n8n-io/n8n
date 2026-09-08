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

export type AppArtifactContextChip = ContextChipBase & {
	type: 'app-artifact';
	/** Absent while the app is still to be created by `apps.create`. */
	appId?: string;
	projectId: string;
	isNewApp: boolean;
};

export type AgentPreviewSessionContextChip = ContextChipBase & {
	type: 'agent-preview-session';
	agentId: string;
	threadId: string;
	executionId?: string;
};

export type AppPreviewDiagnosticsContextChip = ContextChipBase & {
	type: 'app-preview-diagnostics';
	count: number;
};

export type ContextChip =
	| AgentArtifactContextChip
	| AppArtifactContextChip
	| AgentPreviewSessionContextChip
	| AppPreviewDiagnosticsContextChip;
