export type WorkflowResult = {
	workflowId?: unknown;
	url?: unknown;
	previewUrl?: unknown;
	name?: unknown;
	nodeCount?: unknown;
};

export type WorkflowPreviewData = {
	id: string;
	name?: string | null;
	nodes: unknown[];
	connections: Record<string, unknown>;
	settings?: unknown;
	meta?: unknown;
};
