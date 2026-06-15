/**
 * Types for the workflow builder utilities.
 *
 * Adapted from ai-workflow-builder.ee/code-builder/types.ts — only the types
 * relevant to parse/validate, without LangChain dependencies.
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
