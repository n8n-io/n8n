/**
 * SDK Variants for Evaluation
 *
 * This module provides different SDK interface variants for evaluating
 * which produces the most accurate LLM-generated workflow code.
 *
 * Available variants:
 * - current: Object-based syntax (existing SDK)
 * - builder: Builder pattern with explicit methods
 * - graph: Explicit graph connections with indices
 */

export {
	createVariantPrompt,
	getVariantContent,
	getVariantMockTypes,
	getVariantDescription,
	AVAILABLE_VARIANTS,
	type SdkVariant,
} from './create-variant-prompt';

export {
	ROLE,
	WORKFLOW_RULES,
	MANDATORY_WORKFLOW,
	OUTPUT_FORMAT,
	escapeCurlyBrackets,
} from './shared-prompt-sections';

// Re-export variant-specific modules
export * as current from './current';
export * as builder from './builder';
export * as graph from './graph';
