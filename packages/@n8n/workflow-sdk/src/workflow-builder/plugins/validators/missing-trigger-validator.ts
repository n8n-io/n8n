/**
 * Missing Trigger Validator
 *
 * Validates that the workflow has at least one trigger node.
 * Workflows without triggers need to be started manually.
 */

import { isTriggerNodeType } from '../../../utils/trigger-detection';
import type { ValidatorPlugin, PluginContext, ValidationIssue } from '../types';

/**
 * Validator that checks for missing trigger nodes.
 *
 * Returns a warning if the workflow has no trigger node, since such workflows
 * cannot start automatically and need manual execution.
 *
 * Can be disabled via the `allowNoTrigger` validation option.
 */
export const missingTriggerValidator: ValidatorPlugin = {
	id: 'core:missing-trigger',
	name: 'Missing Trigger Validator',
	priority: 90, // High priority - should run early

	// Per-node validation not used - we do workflow-level validation
	validateNode: (): ValidationIssue[] => [],

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		// Check if the allowNoTrigger option is set
		if (ctx.validationOptions?.allowNoTrigger) {
			return [];
		}

		// Check if any node is a trigger
		const hasTrigger = [...ctx.nodes.values()].some((graphNode) =>
			isTriggerNodeType(graphNode.instance.type),
		);

		if (!hasTrigger) {
			return [
				{
					code: 'MISSING_TRIGGER',
					message: 'Workflow has no trigger node. It will need to be started manually.',
					severity: 'warning',
				},
			];
		}

		return [];
	},
};
