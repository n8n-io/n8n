/**
 * Centralized registry for node-type specific guides and examples.
 *
 * This module imports all guides and examples and builds the lookup arrays.
 * Pattern matching is used to find relevant content based on node type.
 */

import {
	RESOURCE_LOCATOR_EXAMPLES,
	RESOURCE_LOCATOR_EXAMPLES_CONFIG,
} from './examples/advanced/resource-locator-examples';
import {
	TOOL_NODE_EXAMPLES,
	TOOL_NODE_EXAMPLES_CONFIG,
} from './examples/advanced/tool-node-examples';
import { IF_NODE_EXAMPLES, IF_NODE_EXAMPLES_CONFIG } from './examples/basic/if-node-examples';
import { SET_NODE_EXAMPLES, SET_NODE_EXAMPLES_CONFIG } from './examples/basic/set-node-examples';
import {
	SIMPLE_UPDATE_EXAMPLES,
	SIMPLE_UPDATE_EXAMPLES_CONFIG,
} from './examples/basic/simple-updates';
import {
	SWITCH_NODE_EXAMPLES,
	SWITCH_NODE_EXAMPLES_CONFIG,
} from './examples/basic/switch-node-examples';
import { HTTP_REQUEST_GUIDE, HTTP_REQUEST_CONFIG } from './node-types/http-request';
import { IF_NODE_GUIDE, IF_NODE_CONFIG } from './node-types/if-node';
import { SET_NODE_GUIDE, SET_NODE_CONFIG } from './node-types/set-node';
import { SWITCH_NODE_GUIDE, SWITCH_NODE_CONFIG } from './node-types/switch-node';
import { TOOL_NODES_GUIDE, TOOL_NODES_CONFIG } from './node-types/tool-nodes';
import {
	RESOURCE_LOCATOR_GUIDE,
	RESOURCE_LOCATOR_CONFIG,
} from './parameter-types/resource-locator';
import { SYSTEM_MESSAGE_GUIDE, SYSTEM_MESSAGE_CONFIG } from './parameter-types/system-message';
import { TEXT_FIELDS_GUIDE, TEXT_FIELDS_CONFIG } from './parameter-types/text-fields';
import type { NodeTypeGuide, NodeTypeExamples, NodeTypePattern, PromptContext } from './types';

// ============================================================================
// Centralized Registration
// ============================================================================

/**
 * All registered guides, built from imported configs.
 */
const guides: NodeTypeGuide[] = [
	// Node-type guides
	{ ...SET_NODE_CONFIG, content: SET_NODE_GUIDE },
	{ ...IF_NODE_CONFIG, content: IF_NODE_GUIDE },
	{ ...SWITCH_NODE_CONFIG, content: SWITCH_NODE_GUIDE },
	{ ...HTTP_REQUEST_CONFIG, content: HTTP_REQUEST_GUIDE },
	{ ...TOOL_NODES_CONFIG, content: TOOL_NODES_GUIDE },
	// Parameter-type guides
	{ ...RESOURCE_LOCATOR_CONFIG, content: RESOURCE_LOCATOR_GUIDE },
	{ ...SYSTEM_MESSAGE_CONFIG, content: SYSTEM_MESSAGE_GUIDE },
	{ ...TEXT_FIELDS_CONFIG, content: TEXT_FIELDS_GUIDE },
];

/**
 * All registered examples, built from imported configs.
 */
const examples: NodeTypeExamples[] = [
	{ ...SET_NODE_EXAMPLES_CONFIG, content: SET_NODE_EXAMPLES },
	{ ...IF_NODE_EXAMPLES_CONFIG, content: IF_NODE_EXAMPLES },
	{ ...SWITCH_NODE_EXAMPLES_CONFIG, content: SWITCH_NODE_EXAMPLES },
	{ ...SIMPLE_UPDATE_EXAMPLES_CONFIG, content: SIMPLE_UPDATE_EXAMPLES },
	{ ...TOOL_NODE_EXAMPLES_CONFIG, content: TOOL_NODE_EXAMPLES },
	{ ...RESOURCE_LOCATOR_EXAMPLES_CONFIG, content: RESOURCE_LOCATOR_EXAMPLES },
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
 * Returns guides sorted by priority (lower priority number = earlier in list).
 * Default priority is 50 if not specified.
 *
 * @param context - The prompt context containing nodeType and other metadata
 * @returns Array of matching guides, sorted by priority
 */
export function getMatchingGuides(context: PromptContext): NodeTypeGuide[] {
	return guides
		.filter((guide) => {
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
		})
		.sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));
}

/**
 * Gets all examples matching the given context.
 *
 * Returns examples sorted by priority (lower priority number = earlier in list).
 * Default priority is 50 if not specified.
 *
 * @param context - The prompt context containing nodeType and other metadata
 * @returns Array of matching examples, sorted by priority
 */
export function getMatchingExamples(context: PromptContext): NodeTypeExamples[] {
	return examples
		.filter((example) => {
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
		})
		.sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));
}

/**
 * Clears all registered guides and examples.
 * Used primarily for testing.
 */
export function clearRegistry(): void {
	guides.length = 0;
	examples.length = 0;
}
