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
export {
	EXPRESSION_REFERENCE,
	WORKFLOW_PATTERNS,
	ADDITIONAL_FUNCTIONS,
	WORKFLOW_RULES,
} from './prompts';
