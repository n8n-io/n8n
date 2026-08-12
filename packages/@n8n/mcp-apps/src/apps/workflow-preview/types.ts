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

/**
 * Trimmed node type description delivered by `get_workflow_details` when
 * called with `includeNodeTypes: true`. Structurally a subset of
 * n8n-workflow's `INodeTypeDescription` (see `PreviewNodeType` on the server
 * side): icons inlined as data URIs, `properties` trimmed to the structural
 * fields parameter-default resolution needs. Fields the preview does not
 * inspect are typed `unknown`; the canvas host adapts this to
 * `INodeTypeDescription` at its trust boundary.
 */
export type WorkflowPreviewNodeType = {
	name: string;
	displayName: string;
	version: number | number[];
	group: string[];
	description?: unknown;
	defaults?: unknown;
	inputs: unknown;
	outputs: unknown;
	inputNames?: unknown;
	outputNames?: unknown;
	icon?: unknown;
	iconColor?: unknown;
	iconUrl?: unknown;
	badgeIconUrl?: unknown;
	subtitle?: unknown;
	properties: unknown[];
};
