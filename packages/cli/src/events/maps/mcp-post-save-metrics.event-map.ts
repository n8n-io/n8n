/**
 * Low-cardinality metrics events emitted by MCP workflow-builder tools and
 * consumed by the Prometheus collector.
 */

export type McpPostSaveTool = 'create' | 'update';

export type McpPostSaveMetricsEventMap = {
	'mcp-post-save-failure': {
		tool: McpPostSaveTool;
		errorType: string;
	};
};
