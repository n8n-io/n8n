/**
 * Execute-Once Aggregator Validator
 *
 * Flags summary / digest / report / shared-context nodes that sit downstream of
 * a multi-item producer (Filter, Split Out, Split In Batches) without
 * `executeOnce: true`. Those nodes then run once per item and duplicate the
 * final effect.
 */

import { findUpstream, mainInputSources } from './connection-helpers';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const MULTI_ITEM_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.filter',
	'n8n-nodes-base.splitOut',
	'n8n-nodes-base.splitInBatches',
	'n8n-nodes-base.itemLists',
]);

const EFFECT_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.slack',
	'n8n-nodes-base.gmail',
	'n8n-nodes-base.telegram',
	'n8n-nodes-base.emailSend',
	'n8n-nodes-base.discord',
	'n8n-nodes-base.microsoftTeams',
	'n8n-nodes-base.mattermost',
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.code',
]);

const AGGREGATOR_NAME =
	/\b(summary|digest|report|aggregate|ranking|rank|shared\s*context|notify\s*once)\b/i;

const MAX_UPSTREAM_HOPS = 6;

function isAggregatorCandidate(node: NodeInstance<string, string, unknown>): boolean {
	if (node.config?.executeOnce === true) return false;
	if (!EFFECT_TYPES.has(node.type) && !AGGREGATOR_NAME.test(node.name)) return false;
	return AGGREGATOR_NAME.test(node.name);
}

function hasMultiItemAncestor(
	nodeName: string,
	nodes: ReadonlyMap<string, GraphNode>,
): string | undefined {
	return findUpstream(
		nodeName,
		nodes,
		(_name, candidate) => MULTI_ITEM_TYPES.has(candidate.instance.type),
		{ maxHops: MAX_UPSTREAM_HOPS },
	);
}

/**
 * Validator for missing executeOnce on aggregator / summary effect nodes.
 */
export const executeOnceAggregatorValidator: ValidatorPlugin = {
	id: 'core:execute-once-aggregator',
	name: 'Execute-Once Aggregator Validator',
	priority: 38,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		if (!isAggregatorCandidate(node)) return [];

		// Need at least one main predecessor so we are not flagging a trigger-adjacent leaf.
		if (mainInputSources(node.name, ctx.nodes).length === 0) return [];

		const ancestor = hasMultiItemAncestor(node.name, ctx.nodes);
		if (ancestor === undefined) return [];

		return [
			{
				code: 'MISSING_EXECUTE_ONCE',
				message:
					`'${node.name}' looks like a summary/digest/report/shared-context step downstream of ` +
					`multi-item producer '${ancestor}', but executeOnce is not true. It will run once per item ` +
					'and duplicate the effect. Set `executeOnce: true` on this node (or move it onto a ' +
					'parallel branch that runs once).',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: 'executeOnce',
			},
		];
	},
};
