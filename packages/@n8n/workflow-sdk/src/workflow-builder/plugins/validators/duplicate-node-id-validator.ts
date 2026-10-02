/**
 * Duplicate Node ID Validator
 *
 * Validates that no two nodes declare the same `config.id`.
 *
 * A node id is the node's stable identity in n8n: execution logs pair a run against the
 * canvas by it, and `(workflowId, nodeId)` is the primary key for poll cursors, dedupe
 * records and publication status. Two nodes sharing one id therefore contend over the same
 * durable state. The usual cause is a node block copy-pasted together with its `id`, so
 * failing the build is what lets the author correct it.
 */

import type { ValidatorPlugin, PluginContext, ValidationIssue } from '../types';

/**
 * Validator that reports one error per id claimed by more than one node.
 */
export const duplicateNodeIdValidator: ValidatorPlugin = {
	id: 'core:duplicate-node-id',
	name: 'Duplicate Node ID Validator',
	priority: 90,

	// Per-node validation not used - a collision is only visible workflow-wide
	validateNode: (): ValidationIssue[] => [],

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		const nodeNamesById = new Map<string, string[]>();

		for (const [nodeName, graphNode] of ctx.nodes) {
			const declaredId = graphNode.instance.config?.id;
			if (!declaredId) continue;

			const claimants = nodeNamesById.get(declaredId);
			if (claimants) {
				claimants.push(nodeName);
			} else {
				nodeNamesById.set(declaredId, [nodeName]);
			}
		}

		const issues: ValidationIssue[] = [];

		for (const [declaredId, nodeNames] of nodeNamesById) {
			if (nodeNames.length < 2) continue;

			const names = nodeNames.map((name) => `'${name}'`).join(', ');
			issues.push({
				code: 'DUPLICATE_NODE_ID',
				message:
					`Nodes ${names} all declare the id '${declaredId}'. A node's \`id\` identifies one ` +
					'existing saved node and must be unique. Remove the `id` from the node you added — ' +
					'new nodes are assigned one on save.',
				severity: 'error',
				violationLevel: 'major',
			});
		}

		return issues;
	},
};
