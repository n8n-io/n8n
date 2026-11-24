/**
 * FromAI Expression Validator Plugin
 *
 * Validates that $fromAI expressions are only used in tool nodes.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import { isToolNode, containsFromAI } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

/**
 * Validator for $fromAI expression usage.
 *
 * Checks for:
 * - $fromAI expressions used in non-tool nodes (only valid in tools connected to AI agents)
 */
export const fromAiValidator: ValidatorPlugin = {
	id: 'core:from-ai',
	name: 'FromAI Expression Validator',
	// No nodeTypes - we check non-tool nodes internally
	priority: 50,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// $fromAI is valid in tool nodes
		if (isToolNode(node.type)) {
			return issues;
		}

		const params = node.config?.parameters;
		if (!params) {
			return issues;
		}

		// Recursively search for $fromAI in all parameter values
		if (containsFromAI(params)) {
			issues.push({
				code: 'FROM_AI_IN_NON_TOOL',
				message: `'${node.name}' uses $fromAI() which is only valid in tool nodes connected to an AI agent.`,
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			});
		}

		return issues;
	},
};
