export interface WorkflowSubWorkflowRequirement {
	workflowId: string;
	referencedWorkflowId: string;
}

export interface AgentWorkflowRequirement {
	agentId: string;
	projectId: string;
	referencedWorkflowId: string;
}

export type WorkflowExportRequirement = WorkflowSubWorkflowRequirement | AgentWorkflowRequirement;
