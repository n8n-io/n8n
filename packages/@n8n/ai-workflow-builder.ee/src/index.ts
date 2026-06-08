export * from './ai-workflow-builder-agent.service.js';
export * from './types/index.js';
export * from './workflow-state.js';
export { resolveConnections } from '@/validation/utils/resolve-connections.js';
export { CodeBuilderAgent, type CodeBuilderAgentConfig } from './code-builder/index.js';
export { CodeWorkflowBuilder, type CodeWorkflowBuilderConfig } from './code-builder/index.js';
export { AssistantHandler } from './assistant/index.js';
export type {
	AssistantContext,
	AssistantResult,
	AssistantSdkClient,
	StreamWriter,
} from './assistant/index.js';
export type { ChatPayload } from './workflow-builder-agent.js';

// Code builder utilities for MCP integration
export {
	ParseValidateHandler,
	WorkflowCodeParseError,
	createCodeBuilderSearchTool,
	createCodeBuilderGetTool,
	createGetSuggestedNodesTool,
	stripImportStatements,
	SDK_IMPORT_STATEMENT,
	EXPRESSION_REFERENCE,
	WORKFLOW_PATTERNS,
	ADDITIONAL_FUNCTIONS,
	WORKFLOW_RULES,
	CODE_BUILDER_SEARCH_NODES_TOOL,
	CODE_BUILDER_GET_NODE_TYPES_TOOL,
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL,
	CODE_BUILDER_VALIDATE_TOOL,
	CODE_BUILDER_VALIDATE_NODE_TOOL,
	MCP_GET_SDK_REFERENCE_TOOL,
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL,
	MCP_ARCHIVE_WORKFLOW_TOOL,
	MCP_UPDATE_WORKFLOW_TOOL,
	MCP_GET_WORKFLOW_BEST_PRACTICES_TOOL,
} from './code-builder/index.js';
export type { ParseAndValidateResult, ValidationWarning } from './code-builder/index.js';

// SSRF guard contract for the web_fetch tool (cli injects its SsrfProtectionService here)
export { type SsrfGuard, createPassthroughSsrfGuard } from './tools/utils/ssrf-guard.js';
