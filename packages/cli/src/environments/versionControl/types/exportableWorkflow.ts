import type { INode, IConnections, IWorkflowSettings } from 'n8n-workflow';

export interface ExportableWorkflow {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	triggerCount: number;
	owner: string;
	// TODO: should we store this?
	// tags?: TagEntity[];
	// tagMappings: WorkflowTagMapping[];

	// versionId: string;
}
