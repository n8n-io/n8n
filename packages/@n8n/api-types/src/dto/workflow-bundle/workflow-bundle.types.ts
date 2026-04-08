import type {
	IConnections,
	INode,
	IPinData,
	IWorkflowSettings,
	WorkflowFEMeta,
} from 'n8n-workflow';

export interface BundleWorkflow {
	id?: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	pinData?: IPinData;
	meta?: WorkflowFEMeta;
}

export interface BundleDataTableSchema {
	originalId: string;
	name: string;
	columns: Array<{
		name: string;
		type: 'string' | 'number' | 'boolean' | 'date';
		index: number;
	}>;
}

export interface WorkflowBundle {
	bundleVersion: 1;
	mainWorkflow: BundleWorkflow;
	subWorkflows: Record<string, BundleWorkflow>;
	dataTableSchemas: BundleDataTableSchema[];
	meta: {
		exportedAt: string;
		instanceId: string;
	};
}

export interface ImportBundleResult {
	mainWorkflowId: string;
	workflowIdMap: Record<string, string>;
	dataTableIdMap: Record<string, string>;
	warnings: string[];
}
