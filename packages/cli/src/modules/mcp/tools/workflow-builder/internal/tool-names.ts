/**
 * MCP tool-name and display-title constants.
 *
 * Duplicated from `@n8n/ai-workflow-builder` to avoid a runtime dependency
 * on the LangChain code-builder package; the duplication is removed in Phase 3.
 */

/** Minimal shape consumed by the MCP tool wrappers. */
export interface McpBuilderToolBase {
	toolName: string;
	displayTitle: string;
}

/**
 * CodeBuilderAgent tools for display when session is loaded
 */
export const CODE_BUILDER_VALIDATE_TOOL: McpBuilderToolBase = {
	toolName: 'validate_workflow',
	displayTitle: 'Validating workflow',
};

export const CODE_BUILDER_SEARCH_NODES_TOOL: McpBuilderToolBase = {
	toolName: 'search_nodes',
	displayTitle: 'Searching nodes',
};

export const CODE_BUILDER_GET_NODE_TYPES_TOOL: McpBuilderToolBase = {
	toolName: 'get_node_types',
	displayTitle: 'Getting node definitions',
};

export const CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: McpBuilderToolBase = {
	toolName: 'get_suggested_nodes',
	displayTitle: 'Getting suggested nodes',
};

/** MCP tools — not used by the code-builder agent, only exposed via the MCP server. */
export const MCP_GET_SDK_REFERENCE_TOOL: McpBuilderToolBase = {
	toolName: 'get_sdk_reference',
	displayTitle: 'Getting SDK reference',
};

export const MCP_CREATE_WORKFLOW_FROM_CODE_TOOL: McpBuilderToolBase = {
	toolName: 'create_workflow_from_code',
	displayTitle: 'Creating workflow from code',
};

export const MCP_ARCHIVE_WORKFLOW_TOOL: McpBuilderToolBase = {
	toolName: 'archive_workflow',
	displayTitle: 'Archiving workflow',
};

export const MCP_UPDATE_WORKFLOW_TOOL: McpBuilderToolBase = {
	toolName: 'update_workflow',
	displayTitle: 'Updating workflow',
};
