// Experiment cleanup (124_workflow_previews_above_assistant)
export interface WorkflowPreviewPosition {
	x: number;
	y: number;
}

export interface WorkflowPreviewNode {
	id: string;
	labelKey: string;
	icon: string;
	position: WorkflowPreviewPosition;
}

export interface WorkflowPreviewConnection {
	source: string;
	target: string;
}

export interface WorkflowPreviewCardVisualization {
	type: 'salesforce-card';
	icon: string;
	titleKey: string;
	subtitleKey: string;
}

export interface WorkflowPreviewSpreadsheetVisualization {
	type: 'invoice-spreadsheet';
}

export interface WorkflowPreviewSlackMessageVisualization {
	type: 'slack-message';
	senderKey: string;
	messageKey: string;
}

export type WorkflowPreviewVisualization =
	| WorkflowPreviewCardVisualization
	| WorkflowPreviewSpreadsheetVisualization
	| WorkflowPreviewSlackMessageVisualization;

export type WorkflowPreviewOutputVisualization = WorkflowPreviewVisualization & {
	targetNodeId: string;
};

export interface WorkflowPreviewIconCycle {
	nodeIds: string[];
	icons: string[];
}

export interface WorkflowPreviewExample {
	id: string;
	titleKey: string;
	promptKey: string;
	nodes: WorkflowPreviewNode[];
	connections: WorkflowPreviewConnection[];
	inputVisualization?: WorkflowPreviewCardVisualization;
	outputVisualizations?: WorkflowPreviewOutputVisualization[];
	iconCycle?: WorkflowPreviewIconCycle;
}
