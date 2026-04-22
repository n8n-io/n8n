/**
 * No Nodes Validator
 *
 * Validates that the workflow has at least one node.
 * An empty workflow cannot do anything useful.
 */

import type { ValidatorPlugin, PluginContext, ValidationIssue } from '../types';

/**
 * Validator that checks for empty workflows.
 *
 * Returns an error if the workflow has no nodes, since an empty workflow
 * cannot perform any operations.
 */
export const noNodesValidator: ValidatorPlugin = {
	id: 'core:no-nodes',
	name: 'No Nodes Validator',
	priority: 100, // High priority - should run early

	// Per-node validation not used - we do workflow-level validation
	validateNode: (): ValidationIssue[] => [],

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		if (ctx.nodes.size === 0) {
			return [
				{
					code: 'NO_NODES',
					message: 'Workflow has no nodes',
					severity: 'error',
					violationLevel: 'critical',
				},
			];
		}
		return [];
	},
};
