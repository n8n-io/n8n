/**
 * Constants for the Code Builder Agent
 *
 * Extracted from code-builder-agent.ts for better organization and testability.
 */

import type { BuilderToolBase } from '@/utils/stream-processor';

/** Maximum iterations for the agentic loop to prevent infinite loops */
export const MAX_AGENT_ITERATIONS = 50;

/** Maximum validate attempts before giving up in text editor mode */
export const MAX_VALIDATE_ATTEMPTS = 10;

/** Instruction appended to validation/parse error messages with steps to fix */
export const FIX_VALIDATION_ERRORS_INSTRUCTION = `
Analyze the errors, then use the editor tool to apply fixes:
1. Which errors are relevant to the last user request? If NONE, stop — do not fix unrelated warnings.
2. Use search_nodes and get_node_types to look up the correct node schema (if not already fetched)
3. Use batch_str_replace to fix ALL identified issues atomically in one call (preferred), or use individual str_replace/insert calls
4. Call validate_workflow ONCE after all fixes are applied
Do NOT output explanations — just fix the code. Do not add or edit comments.`;

/** Native Anthropic text editor tool configuration */
export const TEXT_EDITOR_TOOL = {
	type: 'text_editor_20250728' as const,
	name: 'str_replace_based_edit_tool' as const,
};

/** Batch str_replace tool - applies multiple replacements atomically in one call */
export const BATCH_STR_REPLACE_TOOL = {
	type: 'function' as const,
	function: {
		name: 'batch_str_replace',
		description:
			'Apply multiple str_replace operations to /workflow.js atomically. All replacements are applied in order. If any replacement fails, all changes are rolled back. Example: {"replacements": [{"old_str": "foo", "new_str": "bar"}, {"old_str": "baz", "new_str": "qux"}]}',
		parameters: {
			type: 'object' as const,
			properties: {
				replacements: {
					type: 'array' as const,
					items: {
						type: 'object' as const,
						properties: {
							old_str: { type: 'string' as const, description: 'The exact string to find' },
							new_str: { type: 'string' as const, description: 'The replacement string' },
						},
						required: ['old_str', 'new_str'],
					},
					description: 'Ordered list of replacements to apply',
				},
			},
			required: ['replacements'],
		},
	},
};

/** Validate workflow tool schema - separate from text editor for clearer separation of concerns */
export const VALIDATE_TOOL = {
	type: 'function' as const,
	function: {
		name: 'validate_workflow',
		description:
			'Validate the current workflow code for errors. Returns validation results - either success or a list of errors to fix.',
		parameters: {
			type: 'object' as const,
			properties: {
				path: {
					type: 'string' as const,
					description: 'Path to the workflow file (must be /workflow.js)',
				},
			},
			required: ['path'],
		},
	},
};

/**
 * CodeBuilderAgent tools for display when session is loaded
 */
export const CODE_BUILDER_TEXT_EDITOR_TOOL: BuilderToolBase = {
	toolName: 'str_replace_based_edit_tool',
	displayTitle: 'Editing workflow',
};

export const CODE_BUILDER_BATCH_STR_REPLACE_TOOL: BuilderToolBase = {
	toolName: 'batch_str_replace',
	displayTitle: 'Editing workflow',
};

export const CODE_BUILDER_VALIDATE_TOOL: BuilderToolBase = {
	toolName: 'validate_workflow',
	displayTitle: 'Validating workflow',
};

export const CODE_BUILDER_SEARCH_NODES_TOOL: BuilderToolBase = {
	toolName: 'search_nodes',
	displayTitle: 'Searching nodes',
};

export const CODE_BUILDER_GET_NODE_TYPES_TOOL: BuilderToolBase = {
	toolName: 'get_node_types',
	displayTitle: 'Getting node definitions',
};

export const CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: BuilderToolBase = {
	toolName: 'get_suggested_nodes',
	displayTitle: 'Getting suggested nodes',
};
