/**
 * Code nodes (Code, Function, Function Item) → `ctx.code` steps.
 *
 * The fallback host runs the code of a `ctx.code` step as the body of
 * `async function (items)`, with `items` as plain JSON objects. The converter
 * adds a short prologue that gives the v1 names: `items` as `{ json }`
 * wrappers, `$input`, and in "each item" mode `$json`, `$itemIndex` and
 * `item`. The user code runs in an inner function, so it can declare these
 * names again.
 *
 * A code that reads another node with `$('Node')` gets that node's items in
 * one extra item `{ $nodes: { … } }` after the input items. The prologue takes
 * it off again.
 *
 * Binary data: an item with binary data has it in its `$binary` key (see
 * `binary.ts` of the fallback host). The prologue moves it to `binary`, as n8n
 * gives it to the code, and the host moves the `binary` of returned items back.
 * The host gives the code Luxon (`DateTime`, `$now`, `$today`), `Buffer`,
 * `this.helpers` for binary data, and `require` of allowed modules.
 *
 * Python code (`language: pythonNative`) becomes a `ctx.code` step with
 * `language: 'python'`. The prologue gives the names of n8n's Python runner:
 * `_items` in "all items" mode, `_item` in "each item" mode.
 */
import { eachItemModeError, lowerCodeNative, previousRunsOnce } from './code-native/index.ts';
import type { Code } from './code.ts';
import { escapeControls, raw, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import { emitStep, hostFormOf, lowerFallback } from './steps.ts';

/**
 * Names of v1's data proxy that the host does not give to code steps. Code that reads one
 * does not convert, so n8n runs the workflow on v1.
 */
const MISSING_GLOBALS = [
	'$evaluateExpression',
	'$secrets',
	'$mode',
	'$self',
	'$parameter',
	'$rawParameter',
	'$nodeId',
	'$webhookId',
	'$agentInfo',
	'$data',
	'$tool',
	'$getPairedItem',
	'$fromAI',
	'$fromAi',
	'$fromai',
	'$position',
	'$thisItem',
	'$thisItemIndex',
	'$thisRunIndex',
];

/** True when the code reads the name `global` as an identifier. */
function readsGlobal(user: string, global: string): boolean {
	return new RegExp(`(?<![\\w$.])\\${global}(?![\\w$])`).test(user);
}

/**
 * Reads that the host cannot give as v1 does, each with the reason. The data of these reads
 * is in n8n's run data, and the compiled engine does not keep it.
 */
const INEXACT_READS: Array<[RegExp, string]> = [
	[
		/\$workflow\b(?!\s*\??\.\s*(?:id|name)\b)/,
		'`$workflow` other than `.id` and `.name`: the active state of the workflow is not known',
	],
	[/\$execution\s*\??\.\s*customData\b/, '`$execution.customData`: custom data is not kept'],
	[/\$input\s*\??\.\s*(?:params|context)\b/, '`$input.params` or `$input.context`'],
	[
		/\$items\(\s*[^,()]+,/,
		'`$items` with an output or a run: the host has the items of one output of the last run',
	],
	[
		/\$\([^()]*\)\s*\??\.\s*(?:all|first|last)\(\s*[^)\s]/,
		'`.all()`, `.first()` or `.last()` with an output or a run',
	],
	[
		/\$node\b[^;\n]*?\.\s*(?:context|parameter|runIndex)\b/,
		'`$node[…]` other than `.json`, `.data` and `.binary`',
	],
];

/** A member of `$('Node')` that reads the item that v1 pairs with an input item. */
const PAIRED_MEMBER = '(?:item\\b(?!\\s*[(:])|itemMatching\\b|pairedItem\\b)';

/**
 * The nodes whose paired items the code reads (`.item`, `.itemMatching(k)`, `.pairedItem(k)`),
 * or `all` when the code can read the paired items of each node that it names: it keeps the
 * result of `$(…)` in a value, or gives the name of the node as a value.
 */
function pairedReads(user: string): string[] | 'all' {
	const names: string[] = [];
	const direct = new RegExp(
		`\\$\\(\\s*(['"\`])((?:\\\\.|(?!\\1).)*)\\1\\s*\\)\\s*\\??\\.\\s*${PAIRED_MEMBER}`,
		'g',
	);
	for (const m of user.matchAll(direct)) {
		const name = m[2].replace(/\\(.)/g, '$1');
		if (!names.includes(name)) names.push(name);
	}
	const held = /\$\((?:[^()]|\([^()]*\))*\)(?!\s*\??\.\s*[A-Za-z_$])/.test(user);
	const computed = /\$\(\s*(?:[^'"`\s)]|`[^`]*\$\{)/.test(user);
	if (held || computed) {
		const other = user.replace(/\$input\s*\??\.\s*item\b/g, '');
		const member = new RegExp(
			`\\??\\.\\s*${PAIRED_MEMBER}|\\[\\s*['"\`](?:item|itemMatching|pairedItem)['"\`]\\s*\\]`,
		);
		if (member.test(other)) return 'all';
	}
	return names;
}

/** True when the code of "each item" mode reads the name `items`, which v1 does not define there. */
function readsItemsOfAllMode(user: string): boolean {
	if (!/(?<![\w$.])items\b(?!\s*:)/.test(user)) return false;
	return !/\b(?:const|let|var)\s+items\b|\bitems\s*=>|[(,]\s*items\s*[,)]/.test(user);
}

/** Wraps a wire item as an n8n item: `$binary` becomes `binary`, and v1's paired item is the position. */
const WRAP = `const __wrap = (j, index) => {
	const pairedItem = { item: index };
	if (j !== null && typeof j === 'object' && j.$binary) {
		const { $binary, ...json } = j;
		return { json, binary: $binary, pairedItem };
	}
	return { json: j, pairedItem };
};
`;

/** Indents each line that has text, as Python's `textwrap.indent` does. */
function indent(text: string, prefix: string): string {
	return text
		.split('\n')
		.map((l) => (l.trim() === '' ? l : `${prefix}${l}`))
		.join('\n');
}

const PY_WRAP = `def __wf_wrap(j):
    if isinstance(j, dict) and "$binary" in j:
        return {"json": {k: v for k, v in j.items() if k != "$binary"}, "binary": j["$binary"]}
    return {"json": j}
`;

/** Python, all items: n8n's runner gives `_items` and runs the code as `_user_function`. */
function pythonAllItems(user: string): string {
	return `${PY_WRAP}_items = [__wf_wrap(j) for j in items]
def _user_function():
${indent(user, '    ')}
    return None
return _user_function()
`;
}

/** Python, each item: `_item` for each item; the result handling of n8n's runner. */
function pythonEachItem(user: string): string {
	return `${PY_WRAP}__wf_out = []
for __wf_j in items:
    _item = __wf_wrap(__wf_j)
    def _user_function():
${indent(user, '        ')}
        return None
    __wf_r = _user_function()
    if __wf_r is None:
        continue
    if isinstance(__wf_r, dict) and "json" in __wf_r:
        __wf_o = {"json": __wf_r["json"]}
    elif isinstance(__wf_r, dict) and "binary" in __wf_r:
        __wf_o = {"json": {k: v for k, v in __wf_r.items() if k != "binary"}}
    else:
        __wf_o = {"json": __wf_r}
    if isinstance(__wf_r, dict) and "binary" in __wf_r:
        __wf_o["binary"] = __wf_r["binary"]
    __wf_out.append(__wf_o)
return __wf_out
`;
}

function templateLiteral(text: string): string {
	// Control characters as escapes, after the backslashes: the generator uses some as markers.
	return `\`${escapeControls(
		text
			.replace(/\\/g, '\\\\')
			.replace(/`/g, '\\`')
			.replace(/\$\{/g, '\\$' + '{'),
	)}\``;
}

function nodeReferences(code: string): string[] {
	const out: string[] = [];
	const re =
		/\$\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*\)|\$node\s*\[\s*(['"])((?:\\.|(?!\3).)*)\3\s*\]|\$items\(\s*(['"])((?:\\.|(?!\5).)*)\5/g;
	for (let m = re.exec(code); m !== null; m = re.exec(code)) {
		const name = (m[2] ?? m[4] ?? m[6] ?? '').replace(/\\(.)/g, '$1');
		// A template literal with `${…}` is not a fixed name (see the computed names in lowerCode).
		if (m[1] === '`' && /\$\{/.test(name)) continue;
		if (!out.includes(name)) out.push(name);
	}
	return out;
}

const NODES_PROLOGUE = `const __last = items[items.length - 1];
const __context = __last && __last.$nodes ? (items.pop(), __last) : { $nodes: {} };
const __nodes = __context.$nodes;
// The nodes of the workflow that have no run before this node, for code that computes a name.
for (const name of __notRun) __nodes[name] = null;
const __known = (name) => Object.prototype.hasOwnProperty.call(__nodes, name);
// The index of the item that the code runs for; 0 in "all items" mode, as in v1's data proxy.
let __current = 0;
// An error of v1's data proxy: the task runner gives its message without a line, and the
// error is no Error of the realm of the code.
const __fail = (message) => {
	throw Object.defineProperty({ name: 'ExpressionError', message }, 'toString', {
		value: () => 'ExpressionError: ' + message,
	});
};
// $execution as n8n gives it to the Code node. The converter refuses code that reads custom data.
const $execution = {
	...(__context.$execution || {}),
	customData: { set() {}, setAll() {}, get() { return undefined; }, getAll() { return {}; } },
};
const __lists = {};
// As v1: each read of a node gives the same items.
const __list = (name) => (__lists[name] ??= (__nodes[name] || []).map((json, k) => __wrap(json, k)));
// The item of a node that pairs with input item k (v1's pairedItemMethod). v1 pairs the items
// of the node with the input items by position, or the converter gives the index of the paired
// item of each input item (\`$pairs\`): a number, or the error of v1 for that item.
const __pairs = __context.$pairs || {};
const __paired = (name, k, matching) => {
	if (k === undefined) {
		if (matching) __fail('Missing item index for .itemMatching()');
		k = __current;
	}
	if (!__inputItems()[k]) __fail('Can’t get data');
	if (!Object.prototype.hasOwnProperty.call(__pairs, name)) return __list(name)[k];
	const pairs = __pairs[name];
	if (typeof pairs[k] !== 'number') __fail(pairs[k].$error);
	return __list(name)[pairs[k]];
};
const $ = (name) => {
	if (!__known(name)) __fail("Referenced node doesn't exist");
	if (__nodes[name] === null) {
		// A node that has not run before this one: n8n throws when the code reads its data.
		const fail = () => __fail("Node '" + name + "' hasn't been executed");
		return { all: fail, first: fail, last: fail, itemMatching: fail, pairedItem: fail, get item() { return fail(); }, isExecuted: false };
	}
	const list = __list(name);
	return {
		all: () => list,
		first: () => list[0],
		last: () => list[list.length - 1],
		get item() { return __paired(name, undefined, false); },
		itemMatching: (k) => __paired(name, k, true),
		pairedItem: (k) => __paired(name, k, false),
		isExecuted: list.length > 0,
	};
};
// $workflow, $runIndex and $prevNode as the converter knows them (see lowerCode).
const $workflow = __context.$workflow;
const $runIndex = __context.$runIndex ?? 0;
const $executionId = __context.$executionId;
const $prevNode = __context.$prevNode;
const $nodeVersion = __context.$nodeVersion;
// \`$node[name]\` of v1's data proxy: the data of the item at the index of the current item.
const $node = new Proxy({}, { has: () => true, get: (_, name) => {
	if (typeof name !== 'string') return undefined;
	if (!__known(name)) __fail("Referenced node doesn't exist");
	const read = () => {
		const count = (__nodes[name] || []).length;
		if (count === 0) __fail("Node '" + name + "' hasn't been executed");
		if (count <= __current) {
			__fail('"' + name + '" node has ' + count + " item(s) but you're trying to access item " + __current);
		}
		return __list(name)[__current];
	};
	return {
		get json() { return read().json; },
		get data() { return read().json; },
		get binary() {
			const out = {};
			const binary = read().binary || {};
			for (const key of Object.keys(binary)) {
				const { data, ...rest } = binary[key];
				out[key] = rest;
			}
			return out;
		},
	};
} });
// Legacy \`$items()\` of v1's data proxy: without a name, the input items (the first one only
// when the node before has "execute once"); \`__inputItems\` gives the list of this mode.
const $items = (name) => {
	if (name === undefined) return __context.$itemsOnce ? __inputItems().slice(0, 1) : __inputItems();
	return __list(name);
};
// Legacy \`$item(k)\` of v1's data proxy: the data of item k, with v1's errors. One run of each node.
const __input = items.slice();
const $item = (k) => {
	const read = (name) => {
		const list = __nodes[name] || [];
		if (list.length === 0) throw new Error("Node '" + name + "' hasn't been executed");
		if (list.length <= k) {
			throw new Error('"' + name + '" node has ' + list.length + " item(s) but you're trying to access item " + k);
		}
		return list[k];
	};
	const node = new Proxy({}, { get: (_, name) => typeof name !== 'string' ? undefined : {
		get json() { return read(name); },
		get data() { return read(name); },
		get binary() { read(name); return {}; },
	} });
	const own = __input[k] && __input[k].$binary ? (({ $binary, ...json }) => json)(__input[k]) : __input[k];
	return { $node: node, $json: own, $binary: (__input[k] && __input[k].$binary) || {} };
};
`;

/** The binary data functions of the legacy Function node: they take the item. */
const FUNCTION_BINARY = `const getBinaryDataAsync = async (item) => item.binary;
const setBinaryDataAsync = async (item, data) => {
	if (!data) throw new Error('No data was provided to setBinaryDataAsync (data: IBinaryKeyData).');
	item.binary = data;
};
const getWorkflowStaticData = (type) => $getWorkflowStaticData(type);
`;

/** The binary data functions of the legacy Function Item node: they act on the current item. */
const FUNCTION_ITEM_BINARY = `	const getBinaryData = () => __item.binary;
	const setBinaryData = async (data) => { __item.binary = data; };
	const getBinaryDataAsync = async () => __item.binary;
	const setBinaryDataAsync = async (data) => {
		if (!data) throw new Error('No data was provided to setBinaryDataAsync (data: IBinaryKeyData).');
		__item.binary = data;
	};
	const getWorkflowStaticData = (type) => $getWorkflowStaticData(type);
`;

/** The prologue of code that reads other nodes; `notRun` names the nodes without a run. */
function nodesPrologue(notRun: string[]): string {
	return `const __notRun = ${JSON.stringify(notRun)};\n${NODES_PROLOGUE}`;
}

export function allItemsCode(
	user: string,
	nodes: boolean,
	legacyFunction = false,
	notRun: string[] = [],
): string {
	return `${nodes ? nodesPrologue(notRun) : ''}${WRAP}${legacyFunction ? FUNCTION_BINARY : ''}items = items.map((j, k) => __wrap(j, k));
const __inputItems = () => items;
const $input = { all: () => items, first: () => items[0], last: () => items[items.length - 1], item: items[0] };
// As n8n's runner: in "all items" mode, $json and $input.item are the first item.
const $json = items[0]?.json;
const $binary = items[0]?.binary;
// The data proxy of n8n's runner has $itemIndex 0 in "all items" mode.
const $itemIndex = 0;
return await (async function VmCodeWrapper() {
${user}
}).call(this);
`;
}

/**
 * The item of one result in "each item" mode, as n8n's task runner gives it:
 * `json` is the `json` of the result (for a result with `binary` and no `json`,
 * an empty object), and the item's binary data is the result's `binary`.
 */
const EACH_ITEM = `const __itemOf = (r, k) => {
	// A result that is not an object is the \`json\` of its item, which is then not valid.
	if (typeof r !== 'object' || Array.isArray(r)) return { json: r };
	const json = 'json' in r ? r.json : 'binary' in r ? {} : r;
	// Without \`json\` on the wire of the task runner, v1 takes the item, which holds its paired item.
	const item = json === undefined ? { json: { pairedItem: { item: k } } } : { json };
	if (r.binary) item.binary = r.binary;
	return item;
};
`;

export function eachItemCode(
	user: string,
	nodes: boolean,
	functionItem: boolean,
	notRun: string[] = [],
): string {
	const invalid = functionItem ? null : eachItemModeError(user);
	// An object with a message and no stack: the host gives the message as it is.
	if (invalid !== null) return `throw { message: ${JSON.stringify(invalid)} };\n`;
	return `${nodes ? nodesPrologue(notRun) : ''}${WRAP}${EACH_ITEM}const __all = items.map((j, k) => __wrap(j, k));
const __inputItems = () => __all;
const __out = [];
for (let $itemIndex = 0; $itemIndex < __all.length; $itemIndex++) {
	const __item = __all[$itemIndex];
${nodes ? '\t__current = $itemIndex;\n' : ''}	const item = ${functionItem ? '__item.json' : '__item'};
${functionItem ? FUNCTION_ITEM_BINARY : ''}	const $json = __all[$itemIndex].json;
	const $binary = __all[$itemIndex].binary;
	const $input = { item: __all[$itemIndex], all: () => __all, first: () => __all[0], last: () => __all[__all.length - 1] };
	const __result = await (async function VmCodeWrapper() {
${user}
}).call(this);
	${
		functionItem
			? // As n8n: the item keeps its binary data, also the data that `setBinaryData` set.
				'if (__result !== undefined && __result !== null) __out.push(__item.binary ? { json: __result, binary: __item.binary } : __result);'
			: // As n8n's runner: a result that is false gives no output.
				'if (__result) __out.push(__itemOf(__result, $itemIndex));'
	}
}
return __out;
`;
}

export function lowerCode(c: NodeContext): void {
	const p = c.parameters;
	const type = c.node.type;
	let user: string;
	let eachItem = false;
	let functionItem = false;
	if (type === 'n8n-nodes-base.code') {
		// As v1: only version 2 reads the language; other versions run JavaScript.
		const language = c.version === 2 ? (p.language ?? 'javaScript') : 'javaScript';
		if (language === 'python' || language === 'pythonNative') {
			lowerPython(c);
			return;
		}
		if (language !== 'javaScript') {
			// v1 fails at run time ("Unsupported language"): the node runs in the host, which
			// gives that error at the same point.
			c.warn('code-language', `The language ${JSON.stringify(language)} is not known.`);
			lowerFallback(c);
			return;
		}
		user = typeof p.jsCode === 'string' ? p.jsCode : '';
		eachItem = p.mode === 'runOnceForEachItem';
	} else if (type === 'n8n-nodes-base.aiTransform') {
		user = typeof p.jsCode === 'string' ? p.jsCode : '';
		if (user === '') {
			// v1 fails at run time ("Missing code for data transformation"): the host gives it.
			c.warn('code-language', 'The AI Transform node has no generated code.', 'jsCode');
			lowerFallback(c);
			return;
		}
	} else if (type === 'n8n-nodes-base.functionItem') {
		user = typeof p.functionCode === 'string' ? p.functionCode : '';
		eachItem = true;
		functionItem = true;
	} else {
		user = typeof p.functionCode === 'string' ? p.functionCode : '';
	}
	// JavaScript that fits the subset runs natively (`code-native/`), else in the host.
	if (lowerCodeNative(c, () => hostFormOf(c, (to) => lowerCode({ ...to, codeNodes: 'host' }))))
		return;
	const codeField =
		type === 'n8n-nodes-base.code' || type === 'n8n-nodes-base.aiTransform'
			? 'jsCode'
			: 'functionCode';
	for (const g of MISSING_GLOBALS) {
		if (readsGlobal(user, g)) {
			throw new NodeFailure(
				'code-global',
				`The code uses \`${g}\`, which code steps in the fallback host do not have.`,
				codeField,
			);
		}
	}
	for (const [form, reason] of INEXACT_READS) {
		if (form.test(user)) {
			throw new NodeFailure(
				'code-global',
				`The code reads ${reason}. The fallback host cannot give it as v1 does.`,
				codeField,
			);
		}
	}
	if (eachItem && !functionItem && readsItemsOfAllMode(user)) {
		throw new NodeFailure(
			'code-global',
			'The code reads `items` in "each item" mode, where v1 does not define it.',
			codeField,
		);
	}
	const refs = nodeReferences(user);
	const notRun: string[] = [];
	// `$(name)`, `$items(name)` or `$node[name]` with a computed name: the code can read any node,
	// so it gets every node.
	// A template literal with `${…}` is a computed name too.
	if (
		/(\$|\$items)\(\s*(?:[^'"`\s)]|`[^`]*\$\{)|\$node\s*\[\s*(?:[^'"`\s\]]|`[^`]*\$\{)/.test(user)
	) {
		for (const n of c.workflow.nodes) {
			if (refs.includes(n.name)) continue;
			if (n.name !== c.node.name && c.ranBefore(n.name) !== null) refs.push(n.name);
			else notRun.push(n.name);
		}
	}
	const paired = pairedReads(user);
	// The index of the paired item of each input item, for a node whose items do not pair with
	// the input items by position (`$pairs` of the prologue).
	const pairLists: string[] = [];
	for (const name of paired === 'all' ? refs : paired) {
		if (name !== c.node.name && c.pairsByPosition(name)) continue;
		// The nodes on the way keep the paired item of each of their items. A path without
		// such a node is not accepted here: it has no proof for the code in the host.
		const tracked = name === c.node.name ? null : c.pairedIndex(name, 'k');
		if (tracked === null || tracked.values.length === 0) {
			throw new NodeFailure(
				'code-node-reference',
				`The code reads the item of node "${name}" that pairs with an input item, and the pairing is not known: v1 follows the paired items of each node on the way.`,
				codeField,
			);
		}
		// The list is a part of the call of the step: plain code before the step would be a
		// node of its own on the canvas.
		c.helper('pairedIndexList');
		const params = tracked.values.map((v) => `${v.param}: Json`).join(', ');
		const values = tracked.values.map((v) => v.value).join(', ');
		pairLists.push(
			`${JSON.stringify(name)}: ((${params}): Json[] => pairedIndexList(${c.input}.length, (k: number): number => ${tracked.code}))(${values})`,
		);
	}
	// $node[name].json follows pairedItem in v1; the converter uses the index of the current
	// item, which equals the paired item only when the items pair by position.
	const nodeAccess = user.matchAll(/\$node\s*\[\s*['"]([^'"]*)['"]\s*\]/g);
	for (const m of nodeAccess) {
		const name = m[1];
		if (name && name !== c.node.name && !c.pairsByPosition(name) && c.ranBefore(name) !== null) {
			throw new NodeFailure(
				'code-node-reference',
				`The code reads node "${name}" with $node, and the pairing of its items with the items of this node is not known: v1 follows the paired items of each node on the way.`,
				codeField,
			);
		}
	}
	if (refs.length > 0 && /\.\s*pairedItem\b(?!\s*\()/.test(user)) {
		throw new NodeFailure(
			'code-node-reference',
			'The code reads `pairedItem` of an item and reads other nodes: the paired items of the items of another node are not known.',
			codeField,
		);
	}
	const lists: string[] = [];
	for (const name of refs) {
		// As v1: a name that is not a node of the workflow is an error of `$(…)` itself.
		if (c.scope.nodeParameters(name) === null) continue;
		// The node itself has no list before its own run here: it reads as "not executed".
		const list = name === c.node.name ? null : c.ranBefore(name);
		if (list === null) {
			// n8n fails only when the code reads the node's data, and not on `isExecuted`.
			c.warn(
				'code-node-reference',
				`The code reads node "${name}", which has not run before this node: reading its data fails.`,
			);
		}
		lists.push(`${JSON.stringify(name)}: ${list ?? 'null'}`);
	}
	const usesExecution = user.includes('$execution');
	const globals: string[] = [];
	if (usesExecution) globals.push('$execution: ctx.execution()');
	if (user.includes('$workflow')) {
		const { workflowId, workflowName } = c.scope;
		globals.push(`$workflow: { id: ${str(workflowId)}, name: ${str(workflowName)}, active: true }`);
	}
	if (user.includes('$runIndex')) globals.push(`$runIndex: ${c.runIndex}`);
	if (user.includes('$nodeVersion')) globals.push(`$nodeVersion: ${c.version}`);
	if (user.includes('$executionId')) globals.push('$executionId: ctx.execution().id');
	if (user.includes('$prevNode')) globals.push(`$prevNode: ${prevNode(c)}`);
	if (/\$items\(\s*\)/.test(user) && previousRunsOnce(c) === true) globals.push('$itemsOnce: true');
	if (pairLists.length > 0) globals.push(`$pairs: { ${pairLists.join(', ')} }`);
	// The prologue defines `$`, `$node`, `$items` and `$item` when the code reads them.
	const context =
		refs.length > 0 || globals.length > 0 || /\$items\b|\$item\b|\$\(|\$node\b/.test(user);
	const legacyFunction = type === 'n8n-nodes-base.function';
	const body = eachItem
		? eachItemCode(user, context, functionItem, notRun)
		: allItemsCode(user, context, legacyFunction, notRun);
	c.markFallback();
	const fields: Array<[string, Code]> = [['code', raw(templateLiteral(body))]];
	// Luxon's default zone in the code, as v1 sets it from the workflow.
	if (c.scope.timezone) fields.push(['timezone', raw(str(c.scope.timezone))]);
	// The runtime sends the workflow static data and keeps the changes (spec 9.7).
	// Function and Function Item code calls it without `$`.
	if (/\bgetWorkflowStaticData\b|\$getWorkflowStaticData\b/.test(user)) {
		fields.push(['staticData', raw('true')]);
	}
	emitStep(c, {
		method: 'code',
		fields,
		perItem: false,
		usesIndex: false,
		oneErrorItem: !eachItem,
		extraItems: context
			? `{ ${[`$nodes: { ${lists.join(', ')} }`, ...globals].join(', ')} }`
			: undefined,
	});
}

/** Code of `$prevNode` for a code step: the node before it, as the expressions give it. */
function prevNode(c: NodeContext): string {
	const src = c.scope.prevSource;
	if (src !== undefined) {
		return `{ name: ${src}?.previousNode, outputIndex: ${src}?.previousNodeOutput ?? 0, runIndex: ${src}?.previousNodeRun ?? 0 }`;
	}
	if (c.scope.prevNode !== null) {
		return `{ name: ${str(c.scope.prevNode)}, outputIndex: 0, runIndex: 0 }`;
	}
	throw new NodeFailure(
		'code-global',
		'The code uses `$prevNode`, and the node before this node is not fixed.',
		'jsCode',
	);
}

/** A Python Code node: the host runs it in `python3` with the rules of n8n's Python runner. */
function lowerPython(c: NodeContext): void {
	const p = c.parameters;
	const user = typeof p.pythonCode === 'string' ? p.pythonCode : '';
	const body = p.mode === 'runOnceForEachItem' ? pythonEachItem(user) : pythonAllItems(user);
	c.markFallback();
	emitStep(c, {
		method: 'code',
		fields: [
			['code', raw(templateLiteral(body))],
			['language', raw("'python'")],
		],
		perItem: false,
		usesIndex: false,
		oneErrorItem: p.mode !== 'runOnceForEachItem',
	});
}
