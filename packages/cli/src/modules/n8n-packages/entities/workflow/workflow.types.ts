import type { AgentRequirementSource } from '../requirement-source';

export interface WorkflowSubWorkflowRequirement {
	workflowId: string;
	referencedWorkflowId: string;
}

export interface AgentWorkflowRequirement extends AgentRequirementSource {
	referencedWorkflowId: string;
	origin: 'top-level' | 'project';
}

export type WorkflowDependencyRequirement =
	| WorkflowSubWorkflowRequirement
	| AgentWorkflowRequirement;
