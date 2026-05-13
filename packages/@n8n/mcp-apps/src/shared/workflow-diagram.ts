export type PreviewWorkflowConnection = {
	node: string;
	type: string;
	index: number;
};

export type PreviewWorkflowConnections = Record<
	string,
	Record<string, Array<PreviewWorkflowConnection[] | null>>
>;

export type PreviewWorkflowNode = {
	name: string;
	type: string;
	position: [number, number];
};

export type PreviewWorkflowOutput = {
	workflowId: string;
	name: string;
	nodes: PreviewWorkflowNode[];
	connections: PreviewWorkflowConnections;
};
