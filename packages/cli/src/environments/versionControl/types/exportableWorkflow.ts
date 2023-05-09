import type { INode, IConnections, IWorkflowSettings } from 'n8n-workflow';

export interface ExportableWorkflow {
	active: boolean;
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	triggerCount: number;
	owner: string;
	versionId: string;
}
