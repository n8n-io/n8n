import type { INode } from 'n8n-workflow';

import { asParameters, isExpression } from '../parameter-readers';

/*
 * Checks that every Item Lists version shares. Each one throws when the value has no
 * exact equivalent in the new node.
 */

// `includeEmpty` is hidden for `count` and `countUnique` in Item Lists, so it has no effect there.
// Summarize applies it, so a stored `true` would change the result.
export function assertIncludeEmptyIsInert(node: INode) {
	const { fieldsToSummarize } = node.parameters;
	const entries = asParameters(fieldsToSummarize)?.values;
	if (!Array.isArray(entries)) return;

	for (const entry of entries.map(asParameters)) {
		if (!entry) continue;
		// `aggregation` defaults to `count`, so saved workflows often omit it.
		const aggregation = entry.aggregation ?? 'count';
		const ignoredByItemLists =
			aggregation === 'count' || aggregation === 'countUnique' || isExpression(aggregation);
		if (!ignoredByItemLists) continue;

		if (entry.includeEmpty !== undefined && entry.includeEmpty !== false) {
			throw new Error(
				'"Include Empty Values" is turned on for a field. The old node ignored this setting for Count and Count Unique, but the new node uses it, so your results could change. Turn it off or replace this node by hand.',
			);
		}
	}
}

// Item Lists groups by split values in a plain object. Every key becomes a string, keys
// like `1` and `"1"` merge, and numeric keys sort first. Summarize 1.1 groups in a `Map`,
// so values keep their type and groups keep their order. The output would change.
export function assertNoSplitBy(node: INode) {
	const { fieldsToSplitBy } = node.parameters;
	if (fieldsToSplitBy === undefined) return;
	if (typeof fieldsToSplitBy !== 'string' || isExpression(fieldsToSplitBy)) {
		throw new Error(
			'"Fields to Split By" is an expression or has an unsupported value. Replace this node by hand.',
		);
	}
	if (fieldsToSplitBy.split(',').some((field) => field.trim() !== '')) {
		throw new Error(
			'"Fields to Split By" is set. The new Summarize node can return the groups in a different order, and numbers stay numbers where the old node returned text. Replace this node by hand.',
		);
	}
}

// Item Lists keeps an empty entry of the comma-separated list. Split Out drops it. That
// changes how many fields are split and can turn a result into an error.
export function assertNoEmptyFieldToSplitOut(node: INode) {
	const { fieldToSplitOut = '' } = node.parameters;
	if (typeof fieldToSplitOut !== 'string') {
		throw new Error(
			'"Field to Split Out" could not be read. Open the node, check this field and migrate again.',
		);
	}
	// An expression can only be checked when it runs.
	if (isExpression(fieldToSplitOut)) return;

	if (fieldToSplitOut.split(',').some((field) => field.trim() === '')) {
		throw new Error(
			'"Field to Split Out" is empty or has an empty name in the list, for example "a,,b". The new node ignores empty names, so the result could change. Remove the empty name or replace this node by hand.',
		);
	}
}
