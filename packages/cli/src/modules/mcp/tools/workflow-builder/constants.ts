/**
 * Re-export code-builder tool constants for use in MCP tool definitions.
 * Keeps tool names and labels consistent between the code-builder agent and the MCP server.
 */
export {
	CODE_BUILDER_SEARCH_NODES_TOOL,
	CODE_BUILDER_GET_NODE_TYPES_TOOL,
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL,
	CODE_BUILDER_VALIDATE_TOOL,
	MCP_GET_SDK_REFERENCE_TOOL,
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL,
	MCP_ARCHIVE_WORKFLOW_TOOL,
	MCP_UPDATE_WORKFLOW_TOOL,
} from '@n8n/ai-workflow-builder';
