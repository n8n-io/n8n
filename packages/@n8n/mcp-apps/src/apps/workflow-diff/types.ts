export type UpdateWorkflowResult = {
	workflowId?: unknown;
	url?: unknown;
	name?: unknown;
	nodeCount?: unknown;
	versionId?: unknown;
	previousVersionId?: unknown;
	appliedOperations?: unknown;
};

/**
 * A workflow version graph as returned by the `get_workflow_version` MCP
 * tool (plus the version identity fields the diff needs). `nodeTypes` is
 * present when the tool was called with `includeNodeTypes: true`.
 */
export type WorkflowVersionData = {
	workflowId: string;
	versionId: string;
	name?: string | null;
	nodes: unknown[];
	connections: Record<string, unknown>;
	nodeTypes?: unknown;
};
