/**
 * The legacy nodes that flow regions compile to, and their parameters. Build and decompile both
 * use these builders, so a saved region reads back only when its parameters match exactly.
 */

export const LOOP_NODE = { type: 'n8n-nodes-base.splitInBatches', version: 3 };
export const SWITCH_NODE = { type: 'n8n-nodes-base.switch', version: 3.2 };
export const FILTER_NODE = { type: 'n8n-nodes-base.filter', version: 2.2 };
export const MERGE_NODE = { type: 'n8n-nodes-base.merge', version: 3.2 };
export const WAIT_NODE = { type: 'n8n-nodes-base.wait', version: 1.1 };
export const STOP_NODE = { type: 'n8n-nodes-base.stopAndError', version: 1 };
export const SPLIT_OUT_NODE = { type: 'n8n-nodes-base.splitOut', version: 1 };
/** Loop state needs a raw JSON output, which the Edit Fields contract of `set` does not have. */
export const LOOP_STATE_NODE = { type: 'n8n-nodes-base.set', version: 3.4 };

/** Loop Over Items output slots (v3). */
export const LOOP_DONE = 0;
export const LOOP_EACH = 1;

/**
 * Loop Over Items keeps its state per node, so an inner loop must start again on each outer
 * pass. It resets when the items come from anywhere but its own return edges.
 */
export const forEachParameters = (batchSize: number, returns: readonly string[]) => ({
	batchSize,
	options: { reset: `={{ !${JSON.stringify([...returns].sort())}.includes($prevNode.name) }}` },
});

// ── loop, paginate, pollUntil ───────────────────────────────────────────────

/** The nodes of a loop region named `head`. Only the head is a name the author writes. */
export const loopNodeNames = (head: string) => ({
	check: `${head} until`,
	next: `${head} next`,
	wait: `${head} wait`,
	limit: `${head} limit`,
});

/**
 * The item field that counts the passes of loop `head`. A count in the item, not `$runIndex`,
 * stays correct when the loop is nested in another loop.
 */
export const passKey = (head: string) => `${head} pass`;

const passOf = (head: string) =>
	`$(${JSON.stringify(head)}).item.json[${JSON.stringify(passKey(head))}]`;

/** The head keeps the state and sets the pass: 0 on entry, the carried count on a return. */
export const loopHeadParameters = (head: string, back: string) => ({
	mode: 'raw',
	jsonOutput: `={{ ({ ...$json, ${JSON.stringify(passKey(head))}: $prevNode.name === ${JSON.stringify(back)} ? $json[${JSON.stringify(passKey(head))}] : 0 }) }}`,
	includeOtherFields: false,
	options: {},
});

/** Switch outputs of a loop check. */
export const CHECK_DONE = 0;
export const CHECK_LIMIT = 1;
export const CHECK_AGAIN = 2;

export const loopCheckSuffix = (head: string, maxIterations: number) =>
	` ? ${CHECK_DONE} : ${passOf(head)} + 1 >= ${maxIterations} ? ${CHECK_LIMIT} : ${CHECK_AGAIN} }}`;

export const loopCheckParameters = (head: string, until: string, maxIterations: number) => ({
	mode: 'expression',
	numberOutputs: 3,
	output: `={{ (${until})${loopCheckSuffix(head, maxIterations)}`,
});

export const loopNextSuffix = (head: string) =>
	`), ${JSON.stringify(passKey(head))}: ${passOf(head)} + 1 }) }}`;

export const loopNextParameters = (head: string, next: string) => ({
	mode: 'raw',
	jsonOutput: `={{ ({ ...(${next}${loopNextSuffix(head)}`,
	includeOtherFields: false,
	options: {},
});

export const loopLimitParameters = (head: string, maxIterations: number) => ({
	errorMessage: `${head} stopped after ${maxIterations} passes without meeting its exit condition`,
});

/** `pollUntil` runs its attempt again on the same state. */
export const samePass = (head: string) => `$(${JSON.stringify(head)}).item.json`;

/** `paginate` ends when its next cursor is null. */
export const noNextPage = (next: string) => `(${next}) == null`;

export type WaitUnit = 'seconds' | 'minutes' | 'hours' | 'days';

export interface Interval {
	readonly amount: number;
	readonly unit: WaitUnit;
}

export const waitParameters = ({ amount, unit }: Interval) => ({
	resume: 'timeInterval',
	amount,
	unit,
});

// ── switch, filter, merge ───────────────────────────────────────────────────

/** The legacy Filter parameters of `filter` for the compiled JavaScript of its condition. */
export const filterParameters = (condition: string) => ({
	conditions: {
		options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
		conditions: [
			{
				id: 'condition-0',
				leftValue: `={{ ${condition} }}`,
				rightValue: '',
				operator: { type: 'boolean', operation: 'true', singleValue: true },
			},
		],
		combinator: 'and',
	},
	options: {},
});

const equalsRule = (field: string, value: string, index: number) => ({
	conditions: {
		options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
		conditions: [
			{
				id: `case-${index}`,
				leftValue: `={{ $json[${JSON.stringify(field)}] }}`,
				rightValue: value,
				operator: { type: 'string', operation: 'equals' },
			},
		],
		combinator: 'and',
	},
	renameOutput: true,
	outputKey: value,
});

/**
 * How `switch` routes items to cases: the node, and the output of each case. Today this is a
 * legacy Switch node. A node contract with named outputs can replace it here only.
 */
export interface CaseRouter {
	readonly type: string;
	readonly version: number;
	readonly parameters: Record<string, unknown>;
	readonly outputs: number;
	/** The output of each case, in the order of the keys. */
	readonly caseOutputs: readonly number[];
	/** The output of the default, or `undefined` when the router has none. */
	readonly defaultOutput: number | undefined;
}

export function caseRouter(
	field: string,
	keys: readonly string[],
	hasDefault: boolean,
): CaseRouter {
	return {
		...SWITCH_NODE,
		parameters: {
			mode: 'rules',
			rules: { values: keys.map((key, index) => equalsRule(field, key, index)) },
			options: hasDefault ? { fallbackOutput: 'extra', renameFallbackOutput: 'default' } : {},
		},
		outputs: keys.length + (hasDefault ? 1 : 0),
		caseOutputs: keys.map((_key, index) => index),
		defaultOutput: hasDefault ? keys.length : undefined,
	};
}

export type MergeJoin = 'append' | 'position' | { readonly left: string; readonly right: string };

export function mergeParameters(join: MergeJoin) {
	if (join === 'append') return { mode: 'append' };
	if (join === 'position') return { mode: 'combine', combineBy: 'combineByPosition', options: {} };
	return {
		mode: 'combine',
		combineBy: 'combineByFields',
		advanced: true,
		mergeByFields: { values: [{ field1: join.left, field2: join.right }] },
		joinMode: 'keepMatches',
		outputDataFrom: 'both',
		options: {},
	};
}

export const splitOutParameters = (field: string) => ({ fieldToSplitOut: field, options: {} });
