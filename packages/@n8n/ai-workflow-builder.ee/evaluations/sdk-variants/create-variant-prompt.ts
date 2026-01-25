/**
 * Variant Prompt Factory
 *
 * Assembles complete prompts for different SDK interface variants.
 * Combines variant-specific sections (SDK_FUNCTIONS, WORKFLOW_PATTERNS)
 * with shared sections (ROLE, WORKFLOW_RULES, MANDATORY_WORKFLOW, OUTPUT_FORMAT).
 */

import {
	ROLE,
	WORKFLOW_RULES,
	MANDATORY_WORKFLOW,
	OUTPUT_FORMAT,
	escapeCurlyBrackets,
} from './shared-prompt-sections';
import {
	SDK_FUNCTIONS as CURRENT_SDK_FUNCTIONS,
	WORKFLOW_PATTERNS as CURRENT_WORKFLOW_PATTERNS,
} from './current';
import {
	SDK_FUNCTIONS as BUILDER_SDK_FUNCTIONS,
	WORKFLOW_PATTERNS as BUILDER_WORKFLOW_PATTERNS,
	BUILDER_SDK_TYPES,
} from './builder';
import {
	SDK_FUNCTIONS as GRAPH_SDK_FUNCTIONS,
	WORKFLOW_PATTERNS as GRAPH_WORKFLOW_PATTERNS,
	GRAPH_SDK_TYPES,
} from './graph';

/** Available SDK interface variants */
export type SdkVariant = 'current' | 'builder' | 'graph';

/** All available variants */
export const AVAILABLE_VARIANTS: SdkVariant[] = ['current', 'builder', 'graph'];

/** Variant-specific content */
interface VariantContent {
	/** SDK function descriptions */
	sdkFunctions: string;
	/** Workflow pattern examples */
	workflowPatterns: string;
	/** TypeScript types for validation (only for non-current variants) */
	mockTypes?: string;
}

/** Map of variant names to their content */
const VARIANT_CONTENT: Record<SdkVariant, VariantContent> = {
	current: {
		sdkFunctions: CURRENT_SDK_FUNCTIONS,
		workflowPatterns: CURRENT_WORKFLOW_PATTERNS,
		// Current variant uses real SDK types from @n8n/workflow-sdk
	},
	builder: {
		sdkFunctions: BUILDER_SDK_FUNCTIONS,
		workflowPatterns: BUILDER_WORKFLOW_PATTERNS,
		mockTypes: BUILDER_SDK_TYPES,
	},
	graph: {
		sdkFunctions: GRAPH_SDK_FUNCTIONS,
		workflowPatterns: GRAPH_WORKFLOW_PATTERNS,
		mockTypes: GRAPH_SDK_TYPES,
	},
};

/**
 * Get variant-specific content
 */
export function getVariantContent(variant: SdkVariant): VariantContent {
	const content = VARIANT_CONTENT[variant];
	if (!content) {
		throw new Error(`Unknown SDK variant: ${variant}. Available: ${AVAILABLE_VARIANTS.join(', ')}`);
	}
	return content;
}

/**
 * Create a complete system prompt for the specified SDK variant.
 *
 * The prompt structure is identical across variants except for:
 * - SDK_FUNCTIONS: Describes the available SDK functions
 * - WORKFLOW_PATTERNS: Shows correct usage examples
 *
 * All other sections (ROLE, WORKFLOW_RULES, MANDATORY_WORKFLOW, OUTPUT_FORMAT)
 * are shared and identical across variants.
 *
 * @param variant - The SDK interface variant to use
 * @param options - Optional configuration
 * @returns The complete system prompt string
 */
export function createVariantPrompt(
	variant: SdkVariant,
	options?: {
		/** Whether to escape curly brackets for LangChain templates */
		escapeBrackets?: boolean;
		/** Additional available nodes section (same for all variants) */
		availableNodesSection?: string;
	},
): string {
	const content = getVariantContent(variant);

	// Assemble the prompt with shared and variant-specific sections
	const sections = [
		ROLE,
		content.sdkFunctions,
		options?.availableNodesSection,
		WORKFLOW_RULES,
		content.workflowPatterns,
		MANDATORY_WORKFLOW,
		OUTPUT_FORMAT,
	].filter((s): s is string => !!s);

	let prompt = sections.join('\n\n');

	if (options?.escapeBrackets) {
		prompt = escapeCurlyBrackets(prompt);
	}

	return prompt;
}

/**
 * Get the mock TypeScript types for a variant (for type checking).
 *
 * For the 'current' variant, this returns undefined - the caller should
 * use the real SDK_API_CONTENT from @n8n/workflow-sdk.
 *
 * For 'builder' and 'graph' variants, returns mock type definitions
 * that define the hypothetical interface for validation.
 *
 * @param variant - The SDK interface variant
 * @returns Mock type definitions or undefined for 'current' variant
 */
export function getVariantMockTypes(variant: SdkVariant): string | undefined {
	return getVariantContent(variant).mockTypes;
}

/**
 * Get human-readable description of a variant for reports.
 */
export function getVariantDescription(variant: SdkVariant): string {
	switch (variant) {
		case 'current':
			return 'Current (Object-Based): ifElse(node, { true: ..., false: ... })';
		case 'builder':
			return 'Builder Pattern: ifElse(node).onTrue(...).onFalse(...)';
		case 'graph':
			return 'Graph-Based: graph.connect(source, outputIdx, target, inputIdx)';
	}
}
