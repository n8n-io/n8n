export interface PreviewWorkflowNodeIcon {
	type: 'icon' | 'file';
	name?: string;
	src?: string;
}

export interface PreviewWorkflowNode {
	id: string;
	label: string;
	icon: PreviewWorkflowNodeIcon;
	iconColor?: string;
	position: { x: number; y: number };
}

export interface PreviewWorkflowConnection {
	source: string;
	target: string;
}

export type PreviewVisualizationType =
	| 'slack-message'
	| 'salesforce-card'
	| 'invoice-spreadsheet'
	| 'whatsapp-chat';

export interface PreviewVisualization {
	type: PreviewVisualizationType;
	props?: Record<string, unknown>;
}

export interface PreviewOutputVisualization {
	type: PreviewVisualizationType;
	props?: Record<string, unknown>;
	targetNodeId: string;
}

export interface CrmCycleVariant {
	icon: PreviewWorkflowNodeIcon;
	label: string;
}

export interface CrmCycleConfig {
	nodeIds: string[];
	variants: CrmCycleVariant[];
	intervalMs?: number;
}

export interface PreviewWorkflow {
	nodes: PreviewWorkflowNode[];
	connections: PreviewWorkflowConnection[];
	inputVisualization?: PreviewVisualization;
	outputVisualization?: PreviewVisualization | PreviewOutputVisualization[];
	crmCycle?: CrmCycleConfig;
}
