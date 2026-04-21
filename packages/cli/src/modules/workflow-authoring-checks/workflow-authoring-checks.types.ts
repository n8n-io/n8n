import type { Logger } from '@n8n/backend-common';
import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';

import type { WorkflowCheckTypeKey } from './workflow-authoring-checks.constants';

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
	checkInstanceId: string;
	type: string;
	name: string;
	severity: WorkflowAuthoringCheckSeverity;
	violations: WorkflowCheckViolation[];
}

export type WorkflowCheckConfigFieldKind = 'nodeType' | 'string';

export interface WorkflowCheckConfigField {
	name: string;
	label: string;
	kind: WorkflowCheckConfigFieldKind;
	required: boolean;
	helpText?: string;
	placeholder?: string;
}

export interface WorkflowCheckConfigSchema {
	fields: WorkflowCheckConfigField[];
}

export interface WorkflowCheckType {
	readonly type: WorkflowCheckTypeKey;
	readonly title: string;
	readonly description: string;
	readonly defaultSeverity: WorkflowAuthoringCheckSeverity;
	readonly configSchema: WorkflowCheckConfigSchema;
	validateConfig(config: unknown): unknown;
	evaluate(ctx: WorkflowCheckContext, config: unknown): Promise<WorkflowCheckViolation[]>;
}

export interface RunWorkflowAuthoringChecksInput {
	workflowId: string;
	nodes: INode[];
	connections: IConnections;
	settings: IWorkflowSettings | undefined;
}
