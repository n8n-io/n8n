/**
 * Nested Split In Batches Validator
 *
 * Nesting Loop Over Items (Split In Batches) inside another node's each-batch
 * branch breaks at runtime. Prefer one outer loop plus HTTP pagination or a
 * sub-workflow for the inner iteration.
 */

import { mainSuccessors, walkDownstream } from './connection-helpers';
import { NODE_TYPES } from '../../../constants/node-types';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

/** Output 1 = each batch (output 0 = done). */
const EACH_BATCH_OUTPUT = 1;

/**
 * Validator for Split In Batches nested inside another Split In Batches loop.
 */
export const nestedSplitInBatchesValidator: ValidatorPlugin = {
	id: 'core:nested-split-in-batches',
	name: 'Nested Split In Batches Validator',
	nodeTypes: [NODE_TYPES.SPLIT_IN_BATCHES],
	priority: 37,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const eachTargets = mainSuccessors(graphNode, EACH_BATCH_OUTPUT);
		if (eachTargets.length === 0) {
			return [];
		}

		const nested = walkDownstream(eachTargets, ctx.nodes, (name, candidate) => {
			// Loopback to this node — do not re-expand done/each or sequential
			// Split In Batches on the done path look nested.
			if (name === node.name) return 'stop';
			if (candidate.instance.type === NODE_TYPES.SPLIT_IN_BATCHES) return 'match';
			return 'continue';
		});

		if (nested === undefined) {
			return [];
		}

		return [
			{
				code: 'NESTED_SPLIT_IN_BATCHES',
				message:
					`'${node.name}' nests '${nested}' Split In Batches on its each-batch branch. ` +
					'Nested Loop Over Items breaks at runtime — keep a single Split In Batches in this workflow ' +
					'and handle the inner iteration with HTTP Request built-in pagination or a sub-workflow.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			},
		];
	},
};
