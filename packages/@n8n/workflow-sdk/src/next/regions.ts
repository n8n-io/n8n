/**
 * The nodes that flow regions compile to, and their parameters: node contracts where one
 * exists, else legacy nodes. Build and decompile both use these builders, so a saved region
 * reads back only when its parameters match exactly.
 */

export const SWITCH_NODE = { type: '@n8n/nodes-base-next.conditionSwitch', version: 1 };
export const FILTER_NODE = { type: '@n8n/nodes-base-next.conditionFilter', version: 1 };
export const WAIT_NODE = { type: '@n8n/nodes-base-next.waitInterval', version: 1 };
export const STOP_NODE = { type: '@n8n/nodes-base-next.stopAndErrorStop', version: 1 };
export const SPLIT_OUT_NODE = { type: '@n8n/nodes-base-next.itemsSplitOut', version: 1 };
export const NO_OP_NODE = { type: '@n8n/nodes-base-next.noOpPass', version: 1 };
/** The item of a loop pass is a whole object, which the Edit Fields contract cannot emit. */
export const LOOP_STATE_NODE = {
	/** The type of a loop head and of its `<head> next` node. */
	type: '@n8n/nodes-base-next.loopStateSet',
	/** The type version of both nodes. */
	version: 1,
};

/** The `where` of a condition contract that holds when the compiled JavaScript is true. */
export const trueWhere = (js: string) => ({
	conditions: [{ type: 'boolean', left: `={{ ${js} }}`, test: { op: 'true' } }],
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
	state: `={{ ({ ...$json, ${JSON.stringify(passKey(head))}: $prevNode.name === ${JSON.stringify(back)} ? $json[${JSON.stringify(passKey(head))}] : 0 }) }}`,
});

/** What a loop does after its last pass: fail the run, or end and emit that pass. */
export type LoopLimit = 'fail' | 'continue';

/**
 * Switch outputs of a loop check: the cases `done` and `limit`, then the fallback. With
 * `continue`, `done` also holds at the limit, so the check has no `limit` case.
 */
export const CHECK_DONE = 0;
export const CHECK_LIMIT = 1;
export const checkAgain = (onLimit: LoopLimit) => (onLimit === 'fail' ? 2 : 1);

export const loopLimitTest = (head: string, maxIterations: number) =>
	`${passOf(head)} + 1 >= ${maxIterations}`;

/** The `done` condition of a loop that ends at its limit. */
const doneOrLimit = (head: string, until: string, maxIterations: number) =>
	`(${until}) || ${loopLimitTest(head, maxIterations)}`;

export const loopCheckParameters = (
	head: string,
	until: string,
	maxIterations: number,
	onLimit: LoopLimit = 'fail',
) => ({
	cases:
		onLimit === 'fail'
			? [
					{ output: 'done', where: trueWhere(until) },
					{ output: 'limit', where: trueWhere(loopLimitTest(head, maxIterations)) },
				]
			: [{ output: 'done', where: trueWhere(doneOrLimit(head, until, maxIterations)) }],
});

/** `loop` without `next` carries the body output to the next pass. */
export const BODY_OUTPUT = '$json';

export const loopNextSuffix = (head: string) =>
	`), ${JSON.stringify(passKey(head))}: ${passOf(head)} + 1 }) }}`;

export const loopNextParameters = (head: string, next: string) => ({
	state: `={{ ({ ...(${next}${loopNextSuffix(head)}`,
});

export const loopLimitParameters = (head: string, maxIterations: number) => ({
	message: `${head} stopped after ${maxIterations} passes without meeting its exit condition`,
});

/** `pollUntil` runs its attempt again on the same state. */
export const samePass = (head: string) => `$(${JSON.stringify(head)}).item.json`;

/** `paginate` ends when its next cursor is null. */
export const noNextPage = (next: string) => `(${next}) == null`;

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

const equalsCase = (field: string, value: string) => ({
	output: value,
	where: {
		conditions: [
			{
				type: 'string',
				left: `={{ $json[${JSON.stringify(field)}] }}`,
				test: { op: 'equals', right: value },
			},
		],
	},
});

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
): CaseRouter {
	return {
		...SWITCH_NODE,
		parameters: { cases: keys.map((key) => equalsCase(field, key)) },
		outputs: keys.length + 1,
		caseOutputs: keys.map((_key, index) => index),
		defaultOutput: hasDefault ? keys.length : undefined,
	};
}

export type MergeJoin = 'append' | 'position' | { readonly left: string; readonly right: string };

/**
 * `merge` builds the Merge node contracts. Append and combine by position count their inputs
 * (`inputs`, 2 when unset); combine by fields has the inputs left and right.
 */
export const MERGE_APPEND_NODE = { type: '@n8n/nodes-base-next.mergeAppend', version: 2 };
export const MERGE_POSITION_NODE = {
	type: '@n8n/nodes-base-next.mergeCombineByPosition',
	version: 1,
};
export const MERGE_COMBINE_NODE = { type: '@n8n/nodes-base-next.mergeCombine', version: 1 };
/** The most inputs of the Merge contracts. */
export const MERGE_MAX_INPUTS = 10;

export const mergeNodeOf = (join: MergeJoin) =>
	join === 'append'
		? MERGE_APPEND_NODE
		: join === 'position'
			? MERGE_POSITION_NODE
			: MERGE_COMBINE_NODE;

/** The parameters of the Merge contract. n8n stores no default, so 2 inputs set no count. */
export function mergeParameters(join: MergeJoin, inputs = 2) {
	if (typeof join === 'object') {
		return { by: { by: 'fields', left: join.left, right: join.right, join: 'inner' } };
	}
	return inputs === 2 ? {} : { inputs };
}

export const splitOutParameters = (field: string) => ({ field });
