import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';

export interface SerializedWorkflow {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	versionId: string;
	parentFolderId: string | null;
	isArchived: boolean;
}

export interface ManifestWorkflowEntry {
	id: string;
	name: string;
	target: string;
}
