export type PreviewWorkflowConnection = {
	node: string;
	type: string;
	index: number;
};

export type PreviewWorkflowConnections = Record<
	string,
	Record<string, Array<PreviewWorkflowConnection[] | null>>
>;

export type PreviewWorkflowNodeIcon =
	| { type: 'file'; src: string }
	| { type: 'icon'; name: string; color?: string }
	| { type: 'unknown' };

export type PreviewWorkflowNodeDisplay =
	| {
			variant: 'stickyNote';
			width: number;
			height: number;
			content?: string;
			color?: number;
	  }
	| { variant: 'node' };

export type PreviewWorkflowNode = {
	name: string;
	type: string;
	icon: PreviewWorkflowNodeIcon;
	display?: PreviewWorkflowNodeDisplay;
	executionStatus?: 'success' | 'error';
	position: [number, number];
};

export type PreviewWorkflowExecution = {
	id: string;
	workflowId: string;
	status: string;
	mode: string;
	startedAt: string | null;
	stoppedAt: string | null;
	waitTill?: string | null;
};

export type PreviewWorkflowOutput = {
	workflowId: string;
	workflowUrl?: string;
	name: string;
	execution?: PreviewWorkflowExecution;
	nodes: PreviewWorkflowNode[];
	connections: PreviewWorkflowConnections;
};
