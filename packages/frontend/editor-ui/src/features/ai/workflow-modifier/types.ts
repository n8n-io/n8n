import type { IWorkflowSettings } from 'n8n-workflow';

// Operation types for workflow modifications
export type WorkflowOperation =
	| AddNodeOperation
	| RemoveNodeOperation
	| UpdateNodeOperation
	| AddConnectionOperation
	| RemoveConnectionOperation
	| UpdateWorkflowSettingsOperation
	| ClearWorkflowOperation;

export interface AddNodeOperation {
	type: 'addNode';
	nodeType: string;
	nodeName: string;
	position: [number, number];
	parameters?: Record<string, any>;
	credentials?: Record<string, { id: string; name: string }>;
}

export interface RemoveNodeOperation {
	type: 'removeNode';
	nodeName: string;
}

export interface UpdateNodeOperation {
	type: 'updateNode';
	nodeName: string;
	parameters?: Record<string, any>;
	position?: [number, number];
	name?: string; // rename node
}

export interface AddConnectionOperation {
	type: 'addConnection';
	sourceNode: string;
	sourceOutputIndex: number;
	targetNode: string;
	targetInputIndex: number;
	connectionType?: string; // defaults to 'main'
}

export interface RemoveConnectionOperation {
	type: 'removeConnection';
	sourceNode: string;
	sourceOutputIndex: number;
	targetNode: string;
	targetInputIndex: number;
}

export interface UpdateWorkflowSettingsOperation {
	type: 'updateWorkflowSettings';
	name?: string;
	tags?: string[];
	settings?: Partial<IWorkflowSettings>;
}

export interface ClearWorkflowOperation {
	type: 'clearWorkflow';
}

export interface OperationResult {
	success: boolean;
	operation: WorkflowOperation;
	error?: string;
	message?: string;
}
