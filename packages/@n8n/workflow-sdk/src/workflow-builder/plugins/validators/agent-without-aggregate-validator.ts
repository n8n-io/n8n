/**
 * Agent Without Aggregate Validator
 *
 * A single-shot AI Agent (or structured-output parser) wired directly to an
 * itemized stream runs once per row and produces malformed / unparseable
 * output. When the upstream path splits items (Filter, Split Out, Split In
 * Batches, Item Lists), aggregate first with a Code node that collects
 * `$input.all()` into one item.
 */

import { isRecord } from '@n8n/utils/is-record';

import { findUpstream, mainInputSources } from './connection-helpers';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const AGENT_TYPE = '@n8n/n8n-nodes-langchain.agent';
const OUTPUT_PARSER_TYPES: ReadonlySet<string> = new Set([
	'@n8n/n8n-nodes-langchain.outputParserStructured',
	'@n8n/n8n-nodes-langchain.outputParserAutofixing',
	'@n8n/n8n-nodes-langchain.outputParserItemList',
]);

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

const MULTI_ITEM_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.filter',
	'n8n-nodes-base.splitOut',
	'n8n-nodes-base.splitInBatches',
	'n8n-nodes-base.itemLists',
]);

const AGGREGATE_PATTERN = /\$input\.all\s*\(/;
const MAX_UPSTREAM_HOPS = 8;

/** Names that imply whole-collection reasoning, not per-item tool use. */
const WHOLE_COLLECTION_NAME =
	/\b(all|series|summar|digest|report|rank|aggregat|collection|every|batch)\b/i;

function isTargetNode(node: NodeInstance<string, string, unknown>): boolean {
	if (OUTPUT_PARSER_TYPES.has(node.type)) return true;
	if (node.type !== AGENT_TYPE) return false;
	// Per-item Agents after a Filter are common and valid; only flag when the
	// node name suggests one-shot reasoning over the whole collection.
	return WHOLE_COLLECTION_NAME.test(node.name);
}

function jsCodeOf(node: NodeInstance<string, string, unknown>): string | undefined {
	const params = node.config?.parameters;
	if (!isRecord(params)) return undefined;
	return typeof params.jsCode === 'string' && params.jsCode.length > 0 ? params.jsCode : undefined;
}

function isAggregatingCode(node: NodeInstance<string, string, unknown>): boolean {
	if (node.type !== CODE_NODE_TYPE) return false;
	const code = jsCodeOf(node);
	return code !== undefined && AGGREGATE_PATTERN.test(code);
}

/**
 * Validator for Agents / output parsers fed itemized streams without aggregation.
 */
export const agentWithoutAggregateValidator: ValidatorPlugin = {
	id: 'core:agent-without-aggregate',
	name: 'Agent Without Aggregate Validator',
	priority: 37,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		if (!isTargetNode(node)) return [];
		if (mainInputSources(node.name, ctx.nodes).length === 0) return [];

		const multiItemAncestor = findUpstream(
			node.name,
			ctx.nodes,
			(_name, candidate) => MULTI_ITEM_TYPES.has(candidate.instance.type),
			{ maxHops: MAX_UPSTREAM_HOPS },
		);
		if (multiItemAncestor === undefined) return [];

		const aggregator = findUpstream(
			node.name,
			ctx.nodes,
			(_name, candidate) => isAggregatingCode(candidate.instance),
			{ maxHops: MAX_UPSTREAM_HOPS },
		);
		if (aggregator !== undefined) return [];

		return [
			{
				code: 'AGENT_WITHOUT_PRIOR_AGGREGATE',
				message:
					`'${node.name}' is downstream of multi-item producer '${multiItemAncestor}' but nothing ` +
					'aggregates the stream into one item first. A single-shot Agent/parser on N items runs once ' +
					'per row and often produces malformed output. Insert a Code node that returns one item, e.g. ' +
					'`return [{ json: { rows: $input.all().map(i => i.json) } }]`, before this node.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			},
		];
	},
};
