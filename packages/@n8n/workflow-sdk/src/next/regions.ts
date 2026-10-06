/**
 * The nodes that flow regions compile to, and their parameters: node contracts where one
 * exists, else legacy nodes. Build and decompile both use these builders, so a saved region
 * reads back only when its parameters match exactly.
 */

export const SWITCH_NODE = { type: '@n8n/nodes-core.conditionSwitch', version: 1 };
export const FILTER_NODE = { type: '@n8n/nodes-core.conditionFilter', version: 1 };
export const WAIT_NODE = { type: '@n8n/nodes-core.waitInterval', version: 1 };
export const SPLIT_OUT_NODE = { type: '@n8n/nodes-core.itemsSplitOut', version: 1 };
export const NO_OP_NODE = { type: '@n8n/nodes-core.noOpPass', version: 1 };
/** The `where` of a condition contract that holds when the compiled JavaScript is true. */
export const trueWhere = (js: string) => ({
	conditions: [{ type: 'boolean', left: `={{ ${js} }}`, test: { op: 'true' } }],
});

// ── loop, paginate, pollUntil ───────────────────────────────────────────────

/** What a loop does after its last pass: fail the run, or end and emit that pass. */
export type LoopLimit = 'fail' | 'continue';

/** When a region emits: once after the last pass (`last`), or after each pass (`each`). */
export type RegionEmit = 'last' | 'each';

/** The time unit of an `Interval`. */
export type WaitUnit = 'seconds' | 'minutes' | 'hours' | 'days';

/** A time span, e.g. `{ amount: 30, unit: 'seconds' }`. */
export interface Interval {
	/** The count of units. */
	readonly amount: number;
	/** The time unit. */
	readonly unit: WaitUnit;
}

export const waitParameters = ({ amount, unit }: Interval) => ({ amount, unit });

// ── switch, filter, merge ───────────────────────────────────────────────────

/** The Filter contract parameters of `filter` for the compiled JavaScript of its condition. */
export const filterParameters = (condition: string) => ({ where: trueWhere(condition) });

const equalsCase = (field: string, value: string, asText: boolean) => ({
	output: value,
	where: {
		conditions: [
			{
				type: 'string',
				left: asText
					? `={{ String($json[${JSON.stringify(field)}] ?? '') }}`
					: `={{ $json[${JSON.stringify(field)}] }}`,
				test: { op: 'equals', right: value },
			},
		],
	},
});

/**
 * A case key that spells a number or a boolean, e.g. `2` or `true`. The field can then hold a
 * number or a boolean, which a string condition refuses, so the router compares the text of
 * the value. A string field with such keys routes the same.
 */
const isValueKey = (key: string) =>
	key === 'true' || key === 'false' || String(Number(key)) === key;

/** The Switch contract names its last output `fallback`, so a case cannot have that name. */
export const FALLBACK_OUTPUT = 'fallback';

/**
 * How `switch` routes items to cases: the Switch contract, and the output of each case. The
 * contract always has a fallback output. Without a default, nothing connects to it, and the
 * items that match no case stop there, as with a legacy Switch without a fallback.
 */
export interface CaseRouter {
	readonly type: string;
	readonly version: number;
	readonly parameters: Record<string, unknown>;
	readonly outputs: number;
	/** The output of each case, in the order of the keys. */
	readonly caseOutputs: readonly number[];
	/** The output of the default, or `undefined` when the region has none. */
	readonly defaultOutput: number | undefined;
}

export function caseRouter(
	field: string,
	keys: readonly string[],
	hasDefault: boolean,
	asText = keys.some(isValueKey),
): CaseRouter {
	return {
		...SWITCH_NODE,
		parameters: { cases: keys.map((key) => equalsCase(field, key, asText)) },
		outputs: keys.length + 1,
		caseOutputs: keys.map((_key, index) => index),
		defaultOutput: hasDefault ? keys.length : undefined,
	};
}

export type MergeJoin =
	| 'append'
	| 'position'
	| 'all'
	| { readonly left: string; readonly right: string }
	| { readonly branch: number };

/**
 * `merge` builds the Merge node contracts. Append, combine by position and choose branch count
 * their inputs (`inputs`, 2 when unset); combine by fields or all pairs has the inputs left and
 * right.
 */
export const MERGE_APPEND_NODE = { type: '@n8n/nodes-core.mergeAppend', version: 2 };
export const MERGE_POSITION_NODE = {
	type: '@n8n/nodes-core.mergeCombineByPosition',
	version: 1,
};
export const MERGE_COMBINE_NODE = { type: '@n8n/nodes-core.mergeCombine', version: 1 };
export const MERGE_CHOOSE_NODE = { type: '@n8n/nodes-core.mergeChooseBranch', version: 1 };
/** The most inputs of the Merge contracts. */
export const MERGE_MAX_INPUTS = 10;

export const mergeNodeOf = (join: MergeJoin) =>
	join === 'append'
		? MERGE_APPEND_NODE
		: join === 'position'
			? MERGE_POSITION_NODE
			: typeof join === 'object' && 'branch' in join
				? MERGE_CHOOSE_NODE
				: MERGE_COMBINE_NODE;

/**
 * The parameters of the Merge contract. n8n stores no default, so 2 inputs set no count and
 * branch 1 sets no `use`.
 */
export function mergeParameters(join: MergeJoin, inputs = 2) {
	const count = inputs === 2 ? {} : { inputs };
	if (join === 'all') return { by: { by: 'all' } };
	if (typeof join !== 'object') return count;
	if ('branch' in join) return { ...count, ...(join.branch === 1 ? {} : { use: join.branch }) };
	return { by: { by: 'fields', left: join.left, right: join.right, join: 'inner' } };
}

export const splitOutParameters = (field: string) => ({ field });
