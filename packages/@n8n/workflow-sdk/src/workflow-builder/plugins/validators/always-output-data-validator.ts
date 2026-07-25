/**
 * Always Output Data Validator
 *
 * `alwaysOutputData: true` delivers an empty result as ONE item with empty
 * json (`{}`), not zero items. Two failure modes follow:
 * - ALWAYS_OUTPUT_DATA_NO_EFFECT: set on a leaf node, where nothing downstream
 *   could have been kept alive by it.
 * - EMPTY_ITEM_NOT_FILTERED: a downstream Code node counts or lists
 *   `$input.all()` without dropping empty-json items, so "0 rows" reports as 1.
 */

import { isRecord } from '@n8n/utils/is-record';

import { findUpstream, mainSuccessors } from './connection-helpers';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

/**
 * Nodes that pass the synthetic empty item straight through, so the flag two or
 * three hops up still reaches the counting Code node. Anything else (filter,
 * loop, aggregate, another Code) may already have dropped it.
 */
const PASS_THROUGH_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.set',
	'n8n-nodes-base.noOp',
	'n8n-nodes-base.dateTime',
	'n8n-nodes-base.renameKeys',
]);

const MAX_UPSTREAM_HOPS = 3;

const COLLECTIVE_READ = /\$input\.all\(\)|\bitems\b/;
const COUNTS_OR_LISTS = /\.length\b|\.map\(|\.join\(|\.filter\(|\.forEach\(|\.reduce\(/;
const FILTERS_EMPTY_JSON = /Object\.keys\(|Object\.entries\(|Object\.values\(/;

function jsCodeOf(node: NodeInstance<string, string, unknown>): string | undefined {
	const params = node.config?.parameters;
	if (!isRecord(params)) return undefined;
	return typeof params.jsCode === 'string' && params.jsCode.length > 0 ? params.jsCode : undefined;
}

function alwaysOutputsData(node: NodeInstance<string, string, unknown>): boolean {
	return node.config?.alwaysOutputData === true;
}

/** A Code node that counts/lists every input item but never drops empty-json ones. */
function countsWithoutFilteringEmpty(node: NodeInstance<string, string, unknown>): boolean {
	if (node.type !== CODE_NODE_TYPE) return false;
	const code = jsCodeOf(node);
	if (!code) return false;
	return COLLECTIVE_READ.test(code) && COUNTS_OR_LISTS.test(code) && !FILTERS_EMPTY_JSON.test(code);
}

/**
 * Validator for alwaysOutputData placement and empty-item handling.
 */
export const alwaysOutputDataValidator: ValidatorPlugin = {
	id: 'core:always-output-data',
	name: 'Always Output Data Validator',
	priority: 40,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		if (alwaysOutputsData(node) && mainSuccessors(graphNode).length === 0) {
			issues.push({
				code: 'ALWAYS_OUTPUT_DATA_NO_EFFECT',
				message:
					`'${node.name}' sets alwaysOutputData: true but has no downstream main connection, so it ` +
					'changes nothing. Set it on the nodes that can emit zero items BEFORE a mandatory effect ' +
					'(the fetch and the filter), not on the formatter or notifier at the end of the branch.',
				severity: 'warning',
				violationLevel: 'minor',
				nodeName: node.name,
				parameterPath: 'alwaysOutputData',
			});
		}

		if (countsWithoutFilteringEmpty(node)) {
			const source = findUpstream(
				node.name,
				ctx.nodes,
				(_name, candidate) => alwaysOutputsData(candidate.instance),
				{
					maxHops: MAX_UPSTREAM_HOPS,
					traverseThrough: (candidate) => PASS_THROUGH_TYPES.has(candidate.instance.type),
				},
			);
			if (source !== undefined) {
				issues.push({
					code: 'EMPTY_ITEM_NOT_FILTERED',
					message:
						`'${node.name}' counts or lists every input item, but upstream '${source}' sets ` +
						'alwaysOutputData: true. An empty result arrives as ONE item with empty json ({}), not zero ' +
						'items, so a "0 rows" run reports 1. Drop empty items first, e.g. ' +
						'const rows = $input.all().filter(i => Object.keys(i.json).length > 0).',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'jsCode',
				});
			}
		}

		return issues;
	},
};
