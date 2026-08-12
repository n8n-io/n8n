import type {
	IWorkflowSettings,
	IConnections,
	INode,
	IPinData,
	IWorkflowGroup,
} from 'n8n-workflow';

import type { ITag } from './tags';

export interface WorkflowNodeDescription {
	summary: string;
	rationale?: string;
}

export type WorkflowNodeDescriptions = Record<string, WorkflowNodeDescription>;

export interface WorkflowMetadata {
	onboardingId?: string;
	templateId?: string;
	instanceId?: string;
	templateCredsSetupCompleted?: boolean;
	nodeDescriptions?: WorkflowNodeDescriptions;
	[key: string]: NonNullable<unknown> | undefined;
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
	activeVersionId?: string | null;
	meta?: WorkflowMetadata;
	nodeGroups?: IWorkflowGroup[];
}

export interface WorkflowDataUpdate {
	id?: string;
	name?: string;
	description?: string | null;
	nodes?: INode[];
	connections?: IConnections;
	settings?: IWorkflowSettings;
	active?: boolean;
	tags?: ITag[] | string[]; // string[] when store or requested, ITag[] from API response
	pinData?: IPinData;
	versionId?: string;
	meta?: WorkflowMetadata;
	nodeGroups?: IWorkflowGroup[];
	parentFolderId?: string;
	uiContext?: string;
	// checksum of workflow snapshot for conflict detection
	expectedChecksum?: string;
	aiBuilderAssisted?: boolean;
	autosaved?: boolean;
}

export interface WorkflowDataCreate extends WorkflowDataUpdate {
	projectId?: string;
}
