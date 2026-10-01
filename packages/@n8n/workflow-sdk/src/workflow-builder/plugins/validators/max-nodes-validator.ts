/**
 * Max Nodes Validator
 *
 * Validates that the workflow doesn't exceed the maximum allowed
 * instances of any node type (as defined in nodeType.description.maxNodes).
 */

import { parseVersion } from '../../string-utils';
import type { ValidatorPlugin, PluginContext, ValidationIssue } from '../types';

/**
 * Validator that checks for max nodes constraint violations.
 *
 * Some node types have a maximum number of instances allowed in a workflow.
 * This validator checks against those limits when a nodeTypesProvider is available.
 */
export const maxNodesValidator: ValidatorPlugin = {
	id: 'core:max-nodes',
	name: 'Max Nodes Validator',
	priority: 80, // Medium-high priority

	// Per-node validation not used - we do workflow-level validation
	validateNode: (): ValidationIssue[] => [],

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		const provider = ctx.validationOptions?.nodeTypesProvider;
		if (!provider) return [];

		const issues: ValidationIssue[] = [];

		// Group nodes by type
		const nodeCountByType = new Map<string, number>();
		for (const graphNode of ctx.nodes.values()) {
			const type = graphNode.instance.type;
			nodeCountByType.set(type, (nodeCountByType.get(type) ?? 0) + 1);
		}

		// Check each type against its maxNodes limit
		for (const [type, count] of nodeCountByType) {
			if (count <= 1) continue;

			const firstNode = [...ctx.nodes.values()].find((n) => n.instance.type === type);
			const versionRaw = firstNode?.instance.version;
			const version = parseVersion(versionRaw);

			const nodeType = provider.getByNameAndVersion(type, version);
			const maxNodes = nodeType?.description?.maxNodes;

			if (maxNodes !== undefined && count > maxNodes) {
				const displayName = nodeType?.description?.displayName ?? type;
				issues.push({
					code: 'MAX_NODES_EXCEEDED',
					message: `Workflow has ${count} ${displayName} nodes. Maximum allowed is ${maxNodes}.`,
					severity: 'error',
				});
			}
		}

		return issues;
	},
};
