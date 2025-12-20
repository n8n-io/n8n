/**
 * Centralized registry for node-type specific guides and examples.
 *
 * This module imports all guides and examples and builds the lookup arrays.
 * Pattern matching is used to find relevant content based on node type.
 */

import {
	IF_NODE_EXAMPLES,
	RESOURCE_LOCATOR_EXAMPLES,
	SET_NODE_EXAMPLES,
	SIMPLE_UPDATE_EXAMPLES,
	SWITCH_NODE_EXAMPLES,
	TOOL_NODE_EXAMPLES,
} from './examples';
import {
	EMBEDDING_NODES_GUIDE,
	GMAIL_GUIDE,
	HTTP_REQUEST_GUIDE,
	IF_NODE_GUIDE,
	RESOURCE_LOCATOR_GUIDE,
	SET_NODE_GUIDE,
	SWITCH_NODE_GUIDE,
	SYSTEM_MESSAGE_GUIDE,
	TEXT_FIELDS_GUIDE,
	TOOL_NODES_GUIDE,
} from './guides';
import type { NodeTypeExamples, NodeTypeGuide, NodeTypePattern, PromptContext } from './types';

// ============================================================================
// Centralized Registration
// ============================================================================

/**
 * All registered guides.
 */
const guides: NodeTypeGuide[] = [
	// Node-type guides
	SET_NODE_GUIDE,
	IF_NODE_GUIDE,
	SWITCH_NODE_GUIDE,
	HTTP_REQUEST_GUIDE,
	TOOL_NODES_GUIDE,
	GMAIL_GUIDE,
	EMBEDDING_NODES_GUIDE,
	// Parameter-type guides
	RESOURCE_LOCATOR_GUIDE,
	SYSTEM_MESSAGE_GUIDE,
	TEXT_FIELDS_GUIDE,
];

/**
 * All registered examples.
 */
const examples: NodeTypeExamples[] = [
	SET_NODE_EXAMPLES,
	IF_NODE_EXAMPLES,
	SWITCH_NODE_EXAMPLES,
	SIMPLE_UPDATE_EXAMPLES,
	TOOL_NODE_EXAMPLES,
	RESOURCE_LOCATOR_EXAMPLES,
];

// ============================================================================
// Pattern Matching
// ============================================================================

/**
 * Checks if a node type matches a pattern.
 *
 * Pattern types:
 * - Exact match: 'n8n-nodes-base.set' matches 'n8n-nodes-base.set'
 * - Suffix wildcard: '*Tool' matches 'gmailTool', 'slackTool'
 * - Prefix wildcard: 'n8n-nodes-base.*' matches 'n8n-nodes-base.set'
 * - Substring match: '.set' matches 'n8n-nodes-base.set'
 *
 * All matching is case-insensitive.
 */
export function matchesPattern(nodeType: string, pattern: NodeTypePattern): boolean {
	const nodeTypeLower = nodeType.toLowerCase();
	const patternLower = pattern.toLowerCase();

	// Exact match
	if (nodeTypeLower === patternLower) {
		return true;
	}

	// Suffix wildcard: *Tool matches gmailTool
	if (patternLower.startsWith('*')) {
		const suffix = patternLower.slice(1);
		return nodeTypeLower.endsWith(suffix);
	}

	// Prefix wildcard: n8n-nodes-base.* matches n8n-nodes-base.set
	if (patternLower.endsWith('*')) {
		const prefix = patternLower.slice(0, -1);
		return nodeTypeLower.startsWith(prefix);
	}

	// Substring match: .set matches n8n-nodes-base.set
	return nodeTypeLower.includes(patternLower);
}

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Gets all guides matching the given context.
 *
 * @param context - The prompt context containing nodeType and other metadata
 * @returns Array of matching guides in registration order
 */
export function getMatchingGuides(context: PromptContext): NodeTypeGuide[] {
	return guides.filter((guide) => {
		// Check if any pattern matches
		const patternMatches = guide.patterns.some((pattern) =>
			matchesPattern(context.nodeType, pattern),
		);
		if (!patternMatches) return false;

		// Check optional condition
		if (guide.condition && !guide.condition(context)) {
			return false;
		}

		return true;
	});
}

/**
 * Gets all examples matching the given context.
 *
 * @param context - The prompt context containing nodeType and other metadata
 * @returns Array of matching examples in registration order
 */
export function getMatchingExamples(context: PromptContext): NodeTypeExamples[] {
	return examples.filter((example) => {
		// Check if any pattern matches
		const patternMatches = example.patterns.some((pattern) =>
			matchesPattern(context.nodeType, pattern),
		);
		if (!patternMatches) return false;

		// Check optional condition
		if (example.condition && !example.condition(context)) {
			return false;
		}

		return true;
	});
}
