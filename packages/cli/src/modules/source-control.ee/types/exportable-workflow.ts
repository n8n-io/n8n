import type { INode, IConnections, IWorkflowSettings } from 'n8n-workflow';

import type { RemoteResourceOwner } from '../../../environments.ee/source-control/types/resource-owner';

export interface ExportableWorkflow {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	triggerCount: number;
	versionId?: string;
	owner: RemoteResourceOwner;
	parentFolderId: string | null;
	isArchived: boolean;
}
