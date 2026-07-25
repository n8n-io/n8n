/**
 * Array Input Collapse Validator
 *
 * Flags Code nodes that read the first input item and treat its `.json` as an
 * array while fed by an HTTP Request node. The HTTP node splits a top-level
 * array into one item per element, so the first item is a single element —
 * the rest are silently dropped.
 */

import { isRecord } from '@n8n/utils/is-record';

import { isNodeChain, type GraphNode, type NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

// Single-item reads in a Code node: the first item of the input, or the current
// item ($input.item / items[0]) when the node runs once per item.
const FIRST_ITEM_READ =
	'(?:\\$input\\.first\\(\\)|\\$input\\.all\\(\\)\\[0\\]|\\$input\\.item|items\\[0\\])';

// Array-distinctive operations. Deliberately excludes string-shared members
// (length/includes/indexOf/join/slice-on-string) to keep false positives low.
const ARRAY_OP =
	'slice|map|filter|forEach|reduce|reduceRight|find|findIndex|some|every|flatMap|sort';

// Array op applied DIRECTLY to a first item's `.json` — `$input.first().json.map(...)`,
// `items[0].json[0]`, or `Array.isArray($input.first().json)`.
const DIRECT = new RegExp(
	String.raw`${FIRST_ITEM_READ}\.json\s*(?:\.\s*(?:${ARRAY_OP})\s*\(|\[)|Array\.isArray\(\s*${FIRST_ITEM_READ}\.json\s*\)`,
);

// `const x = items[0].json` (or $input.first().json) captured so we can check
// whether `x` is later treated as an array. The RHS must END at `.json` — a
// continuation like `.json.results` reads an array sub-field and is fine.
const VIA_VARIABLE = new RegExp(
	String.raw`(?:const|let|var)\s+(\w+)\s*=\s*${FIRST_ITEM_READ}\.json\b(?!\s*[.\[])`,
);

function treatsJsonAsArray(jsCode: string): boolean {
	if (DIRECT.test(jsCode)) return true;
	const assigned = VIA_VARIABLE.exec(jsCode);
	if (assigned) {
		const v = assigned[1];
		const usedAsArray = new RegExp(
			String.raw`\b${v}\s*(?:\.\s*(?:${ARRAY_OP})\s*\(|\[)|Array\.isArray\(\s*${v}\b`,
		);
		if (usedAsArray.test(jsCode)) return true;
	}
	return false;
}

function resolveTargetNodeName(target: unknown): string | undefined {
	if (!target) return undefined;
	if (
		typeof target === 'object' &&
		'node' in target &&
		typeof (target as { node: unknown }).node === 'object'
	) {
		return (target as { node: { name?: string } }).node?.name;
	}
	if (isNodeChain(target)) {
		return target.head.name;
	}
	if (typeof target === 'object' && 'name' in target) {
		return (target as { name: string }).name;
	}
	return undefined;
}

/**
 * Main-input sources feeding `targetName`. Checks graph connections (populated
 * after toJSON merge) and instance `.to()` declarations (present during
 * wf.validate() before mergeInstanceConnections).
 */
function mainInputSources(targetName: string, nodes: ReadonlyMap<string, GraphNode>): string[] {
	const sources: string[] = [];
	for (const [sourceName, graphNode] of nodes) {
		const mainConns = graphNode.connections.get('main');
		if (mainConns) {
			for (const [_outputIndex, targets] of mainConns) {
				for (const target of targets) {
					if (target.node === targetName) {
						sources.push(sourceName);
					}
				}
			}
		}
		if (typeof graphNode.instance.getConnections === 'function') {
			for (const conn of graphNode.instance.getConnections()) {
				if (resolveTargetNodeName(conn.target) === targetName) {
					sources.push(sourceName);
				}
			}
		}
	}
	return [...new Set(sources)];
}

/**
 * Validator for Code nodes that collapse an HTTP Request array input to the
 * first item (ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM).
 */
export const arrayInputCollapseValidator: ValidatorPlugin = {
	id: 'core:array-input-collapse',
	name: 'Array Input Collapse Validator',
	nodeTypes: [CODE_NODE_TYPE],
	priority: 30,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const params = node.config?.parameters;
		const jsCode = isRecord(params) && typeof params.jsCode === 'string' ? params.jsCode : '';
		if (!jsCode || !treatsJsonAsArray(jsCode)) {
			return [];
		}

		const httpParent = mainInputSources(node.name, ctx.nodes).find((sourceName) => {
			const source = ctx.nodes.get(sourceName);
			return source?.instance.type.includes('httpRequest') ?? false;
		});
		if (!httpParent) {
			return [];
		}

		return [
			{
				code: 'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM',
				message:
					'Code node reads the first input item (e.g. $input.first().json / items[0].json) and applies an array ' +
					`operation to it, but its upstream HTTP Request node "${httpParent}" splits a top-level array into one ` +
					'item per element. The first item is a single element, not the whole array, so the rest are dropped. ' +
					'Read every item with $input.all().map(i => i.json) (or iterate the items) instead.',
				severity: 'warning',
				nodeName: node.name,
			},
		];
	},
};
