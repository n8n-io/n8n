import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ValidationWarning } from './workflow-validation-warnings';

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

function nodeTypeByName(json: WorkflowJSON): Map<string, string> {
	const byName = new Map<string, string>();
	for (const node of json.nodes ?? []) {
		if (typeof node.name === 'string' && typeof node.type === 'string') {
			byName.set(node.name, node.type);
		}
	}
	return byName;
}

// Main-input source nodes feeding `targetName`. connections are indexed by source.
function mainInputSources(json: WorkflowJSON, targetName: string): string[] {
	const sources: string[] = [];
	for (const [source, outputs] of Object.entries(json.connections ?? {})) {
		if (!isRecord(outputs)) continue;
		const main = outputs.main;
		if (!Array.isArray(main)) continue;
		for (const port of main) {
			if (!Array.isArray(port)) continue;
			for (const conn of port) {
				if (isRecord(conn) && conn.node === targetName) sources.push(source);
			}
		}
	}
	return sources;
}

/**
 * Flags Code nodes that read the first input item and treat its `.json` as an
 * array while fed by an HTTP Request node. The HTTP node splits a top-level
 * array into one item per element, so the first item is a single element — the
 * rest are silently dropped (INS-662). General across endpoints, array shapes,
 * and array operations; not specific to any one API.
 */
export function detectArrayInputCollapse(json: WorkflowJSON): ValidationWarning[] {
	const warnings: ValidationWarning[] = [];
	const typeByName = nodeTypeByName(json);

	for (const node of json.nodes ?? []) {
		if (node.type !== CODE_NODE_TYPE) continue;
		const params = node.parameters;
		const jsCode = isRecord(params) && typeof params.jsCode === 'string' ? params.jsCode : '';
		if (!jsCode || !treatsJsonAsArray(jsCode)) continue;

		const httpParent =
			typeof node.name === 'string'
				? mainInputSources(json, node.name).find((s) => typeByName.get(s)?.includes('httpRequest'))
				: undefined;
		if (!httpParent) continue;

		warnings.push({
			code: 'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM',
			nodeName: typeof node.name === 'string' ? node.name : undefined,
			message:
				'Code node reads the first input item (e.g. $input.first().json / items[0].json) and applies an array ' +
				`operation to it, but its upstream HTTP Request node "${httpParent}" splits a top-level array into one ` +
				'item per element. The first item is a single element, not the whole array, so the rest are dropped. ' +
				'Read every item with $input.all().map(i => i.json) (or iterate the items) instead.',
		});
	}

	return warnings;
}
