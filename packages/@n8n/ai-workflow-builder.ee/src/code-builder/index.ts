/**
 * Code Builder Module
 *
 * Public API for the code builder agent and related utilities.
 */

// Agent
export { CodeBuilderAgent } from './code-builder-agent';

// Types
export type { CodeBuilderAgentConfig, ParseAndValidateResult, ValidationWarning } from './types';

// Code Workflow Builder
export { CodeWorkflowBuilder } from './code-workflow-builder';
export type { CodeWorkflowBuilderConfig } from './code-workflow-builder';

// Session utilities
export { generateCodeBuilderThreadId } from './utils/code-builder-session';

// Core utilities for MCP integration
export { NodeTypeParser } from './utils/node-type-parser';
export { ParseValidateHandler } from './handlers/parse-validate-handler';
export { createCodeBuilderSearchTool } from './tools/code-builder-search.tool';
export { createCodeBuilderGetTool } from './tools/code-builder-get.tool';
export type { CodeBuilderGetToolOptions } from './tools/code-builder-get.tool';
export { createGetSuggestedNodesTool } from './tools/get-suggested-nodes.tool';
export { stripImportStatements, SDK_IMPORT_STATEMENT } from './utils/extract-code';

// SDK reference content (raw, unescaped curly braces)
export { WORKFLOW_PATTERNS } from './prompts';
export {
	EXPRESSION_REFERENCE,
	ADDITIONAL_FUNCTIONS,
	WORKFLOW_RULES,
} from '../shared/code-builder-and-mcp-prompt-constants';

// Tool name constants (shared between code builder agent and MCP server)
export {
	CODE_BUILDER_SEARCH_NODES_TOOL,
	CODE_BUILDER_GET_NODE_TYPES_TOOL,
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL,
	CODE_BUILDER_VALIDATE_TOOL,
	MCP_GET_SDK_REFERENCE_TOOL,
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL,
	MCP_ARCHIVE_WORKFLOW_TOOL,
	MCP_UPDATE_WORKFLOW_TOOL,
} from './constants';
