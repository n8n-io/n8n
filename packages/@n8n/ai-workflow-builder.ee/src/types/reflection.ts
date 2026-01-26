/**
 * Reflection types for CRITIC pattern implementation.
 *
 * The reflection agent analyzes validation failures to identify root causes
 * and suggest fixes, enabling informed retries instead of blind repetition.
 */

import type { DiscoveryContext } from './discovery-types';
import type { SimpleWorkflow } from './workflow';
import type { ProgrammaticViolation } from '../validation/types';

/**
 * Categories of validation failures for tracking and analysis
 */
export type ReflectionCategory =
	| 'missing_connection' // Node missing required input
	| 'wrong_connection_type' // Connected with wrong ai_* type
	| 'missing_subnode' // AI node missing required subnode (e.g., no Chat Model)
	| 'invalid_structure' // Structural issue (missing trigger, etc.)
	| 'connection_direction' // Source/target reversed (common AI node mistake)
	| 'other';

/**
 * Suggested fix for a validation failure
 */
export interface SuggestedFix {
	/** What action to take */
	action: 'add_node' | 'add_connection' | 'remove_connection' | 'reconfigure';
	/** Which node(s) are involved */
	targetNodes: string[];
	/** Specific guidance on how to fix */
	guidance: string;
}

/**
 * Result of reflection analysis
 */
export interface ReflectionResult {
	/** Brief 1-sentence summary of the validation failure */
	summary: string;
	/** Root cause analysis - WHY this happened, not just WHAT failed */
	rootCause: string;
	/** Category for tracking and pattern analysis */
	category: ReflectionCategory;
	/** Specific actions to fix the issue */
	suggestedFixes: SuggestedFix[];
	/** Strategies that were already tried and should be avoided */
	avoidStrategies: string[];
}

/**
 * Context provided to the reflection agent for analysis
 */
export interface ReflectionContext {
	/** Current validation violations to analyze */
	violations: ProgrammaticViolation[];
	/** Current workflow state */
	workflowJSON: SimpleWorkflow;
	/** Discovery context (what nodes were intended to be created) */
	discoveryContext: DiscoveryContext | null;
	/** Previous reflection attempts in this session (to avoid repeating) */
	previousReflections: ReflectionResult[];
	/** The original user request for context */
	userRequest: string;
}
