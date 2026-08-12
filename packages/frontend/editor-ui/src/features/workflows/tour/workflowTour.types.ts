import type { INode, IWorkflowGroup } from 'n8n-workflow';

export interface WorkflowNodeDescription {
	summary: string;
	rationale?: string;
}

export type WorkflowNodeDescriptions = Record<string, WorkflowNodeDescription>;

export type WorkflowTourNode = Pick<INode, 'id' | 'name' | 'type' | 'typeVersion'>;

export type WorkflowTourGroup = Pick<IWorkflowGroup, 'id' | 'name'>;

export interface WorkflowTourStep {
	nodeId: string;
	nodeName: string;
	description: WorkflowNodeDescription;
	groupId?: string;
	groupName?: string;
}

export interface WorkflowTourCardPlacement {
	left: number;
	top: number;
	maxHeight: number;
	arrowTop: number;
	side: 'left' | 'right';
}
