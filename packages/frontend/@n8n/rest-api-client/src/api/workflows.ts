import type { IWorkflowSettings, IConnections, INode, IPinData } from 'n8n-workflow';

import type { ITag } from './tags';

export interface WorkflowMetadata {
	onboardingId?: string;
	templateId?: string;
	instanceId?: string;
	templateCredsSetupCompleted?: boolean;
}

// Simple version of n8n-workflow.Workflow
export interface WorkflowData {
	id?: string;
	name?: string;
	active?: boolean;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	tags?: string[];
	pinData?: IPinData;
	versionId?: string;
	meta?: WorkflowMetadata;
}

export interface WorkflowDataUpdate {
	id?: string;
	name?: string;
	nodes?: INode[];
	connections?: IConnections;
	settings?: IWorkflowSettings;
	active?: boolean;
	tags?: ITag[] | string[]; // string[] when store or requested, ITag[] from API response
	pinData?: IPinData;
	versionId?: string;
	meta?: WorkflowMetadata;
	parentFolderId?: string;
	uiContext?: string;
}

export interface WorkflowDataCreate extends WorkflowDataUpdate {
	projectId?: string;
}
