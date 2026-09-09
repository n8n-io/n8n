// Nodes that let the user pick their own predefined credential type via a
// parameter ("Authentication" → "Predefined Credential Type") rather than
// declaring a fixed credential in their node type. Gateway credits mints a
// managed credential for a specific, known provider — it can't stand in for
// an arbitrary user-chosen one, so these nodes never offer it. Includes the
// AI-Agent-tool variants ("Tool" suffix) generated from the same node types.
export const AI_GATEWAY_UNSUPPORTED_NODE_TYPES: readonly string[] = [
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.httpRequestTool',
	'@n8n/n8n-nodes-langchain.toolHttpRequest',
	'n8n-nodes-base.graphql',
	'n8n-nodes-base.graphqlTool',
];
