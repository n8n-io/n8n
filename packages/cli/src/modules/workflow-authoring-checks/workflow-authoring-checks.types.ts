import type { Logger } from '@n8n/backend-common';
import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';

export type WorkflowAuthoringCheckSeverity = 'warning' | 'blocking';

export interface WorkflowCheckContext {
	workflowId: string;
	nodes: INode[];
	connections: IConnections;
	connectionsByDestination: IConnections;
	settings: IWorkflowSettings | undefined;
	logger: Logger;
}

export interface WorkflowCheckViolation {
	message: string;
	nodeIds?: string[];
	data?: Record<string, unknown>;
}

export interface WorkflowCheckResult {
	checkId: string;
	title: string;
	severity: WorkflowAuthoringCheckSeverity;
	violations: WorkflowCheckViolation[];
}

export interface WorkflowCheck {
	readonly id: string;
	readonly defaultSeverity: WorkflowAuthoringCheckSeverity;
	readonly title: string;
	readonly description: string;
	evaluate(ctx: WorkflowCheckContext): Promise<WorkflowCheckViolation[]>;
}

export interface RunWorkflowAuthoringChecksInput {
	workflowId: string;
	nodes: INode[];
	connections: IConnections;
	settings: IWorkflowSettings | undefined;
}
