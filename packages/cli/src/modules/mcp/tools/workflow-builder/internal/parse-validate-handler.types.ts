/**
 * Types for the MCP-local ParseValidateHandler.
 *
 * Moved here from `@n8n/ai-workflow-builder` so the MCP server has no
 * runtime dependency on the LangChain-based code-builder package.
 */

import type { WorkflowJSON } from '@n8n/workflow-sdk';

/**
 * Validation warning with optional location info
 */
export interface ValidationWarning {
	code: string;
	message: string;
	nodeName?: string;
	parameterPath?: string;
}

/**
 * Result from parseAndValidate including workflow and any warnings
 */
export interface ParseAndValidateResult {
	workflow: WorkflowJSON;
	warnings: ValidationWarning[];
}
