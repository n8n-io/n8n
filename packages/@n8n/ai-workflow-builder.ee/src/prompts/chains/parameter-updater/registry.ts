/**
 * Registry for node-type specific guides and examples.
 *
 * This module provides a registration-based system for node-type specific
 * prompt content. Guides and examples register themselves with patterns
 * that match against node types, allowing automatic discovery and loading.
 */

import type { NodeTypeGuide, NodeTypeExamples, NodeTypePattern, PromptContext } from './types';

// Internal storage for registered guides and examples
const guides: NodeTypeGuide[] = [];
const examples: NodeTypeExamples[] = [];

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

/**
 * Registers a guide for specific node types.
 *
 * @param guide - The guide configuration with patterns, content, and optional priority
 */
export function registerGuide(guide: NodeTypeGuide): void {
	guides.push(guide);
}

/**
 * Registers examples for specific node types.
 *
 * @param exampleConfig - The examples configuration with patterns, content, and optional priority
 */
export function registerExamples(exampleConfig: NodeTypeExamples): void {
	examples.push(exampleConfig);
}

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
