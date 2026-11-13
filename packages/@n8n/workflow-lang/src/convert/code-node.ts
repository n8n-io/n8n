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
import { lowerCodeNative } from './code-native/index.ts';
import type { Code } from './code.ts';
import { escapeControls, raw, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import { emitStep, lowerFallback } from './steps.ts';

/** n8n globals that the host does not give to code steps. */
const MISSING_GLOBALS = ['$evaluateExpression', '$secrets'];

/** Wraps a wire item as an n8n item: `$binary` becomes `binary`. */
const WRAP = `const __wrap = (j) => {
	if (j !== null && typeof j === 'object' && j.$binary) {
		const { $binary, ...json } = j;
		return { json, binary: $binary };
	}
	return { json: j };
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
// $execution as n8n gives it to the Code node; custom data is not kept.
const $execution = {
	...(__context.$execution || {}),
	customData: { set() {}, setAll() {}, get() { return undefined; }, getAll() { return {}; } },
};
const $ = (name) => {
	if (__nodes[name] === null) {
		// A node that has not run before this one: n8n throws when the code reads its data.
		const fail = () => { throw new Error("Node '" + name + "' hasn't been executed"); };
		return { all: fail, first: fail, last: fail, itemMatching: fail, get item() { return fail(); }, isExecuted: false };
	}
	const list = (__nodes[name] || []).map((json) => ({ json }));
	// itemMatching pairs by position; every item pairs with the only item of a one-item list.
	const itemMatching = (k) => (list.length === 1 ? list[0] : list[k]);
	return { all: () => list, first: () => list[0], last: () => list[list.length - 1], item: list[0], itemMatching, isExecuted: list.length > 0 };
};
// $workflow, $runIndex and $prevNode as the converter knows them (see lowerCode).
const $workflow = __context.$workflow;
const $runIndex = __context.$runIndex ?? 0;
const $executionId = __context.$executionId;
const $prevNode = __context.$prevNode;
const $node = new Proxy({}, { get: (_, name) => ({ json: (__nodes[name] || [])[0] }) });
const $items = (name) => (__nodes[name] || []).map((json) => ({ json }));
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

export function allItemsCode(user: string, nodes: boolean, legacyFunction = false): string {
	return `${nodes ? NODES_PROLOGUE : ''}${WRAP}${legacyFunction ? FUNCTION_BINARY : ''}items = items.map(__wrap);
const $input = { all: () => items, first: () => items[0], last: () => items[items.length - 1], item: items[0] };
// As n8n's runner: in "all items" mode, $json and $input.item are the first item.
const $json = items[0]?.json;
const $binary = items[0]?.binary;
// The data proxy of n8n's runner has $itemIndex 0 in "all items" mode.
const $itemIndex = 0;
return await (async () => {
${user}
})();
`;
}

export function eachItemCode(user: string, nodes: boolean, functionItem: boolean): string {
	return `${nodes ? NODES_PROLOGUE : ''}${WRAP}const __all = items.map(__wrap);
const __out = [];
for (let $itemIndex = 0; $itemIndex < __all.length; $itemIndex++) {
	const __item = __all[$itemIndex];
	const item = ${functionItem ? '__item.json' : '__item'};
${functionItem ? FUNCTION_ITEM_BINARY : ''}	const $json = __all[$itemIndex].json;
	const $binary = __all[$itemIndex].binary;
	const $input = { item: __all[$itemIndex], all: () => __all, first: () => __all[0], last: () => __all[__all.length - 1] };
	const __result = await (async () => {
${user}
	})();
	${
		functionItem
			? // As n8n: the item keeps its binary data, also the data that `setBinaryData` set.
				'if (__result !== undefined && __result !== null) __out.push(__item.binary ? { json: __result, binary: __item.binary } : __result);'
			: 'if (__result !== undefined && __result !== null) __out.push(__result);'
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
	if (lowerCodeNative(c)) return;
	for (const g of MISSING_GLOBALS) {
		if (user.includes(g)) {
			throw new NodeFailure(
				'code-global',
				`The code uses \`${g.replace('(', '')}\`, which code steps in the fallback host do not have.`,
				type === 'n8n-nodes-base.code' || type === 'n8n-nodes-base.aiTransform'
					? 'jsCode'
					: 'functionCode',
			);
		}
	}
	const refs = nodeReferences(user);
	// `$(name)`, `$items(name)` or `$node[name]` with a computed name: the code can read any node,
	// so it gets every node.
	// A template literal with `${…}` is a computed name too.
	if (
		/(\$|\$items)\(\s*(?:[^'"`\s)]|`[^`]*\$\{)|\$node\s*\[\s*(?:[^'"`\s\]]|`[^`]*\$\{)/.test(user)
	) {
		for (const n of c.workflow.nodes) {
			if (!refs.includes(n.name) && n.name !== c.node.name && c.ranBefore(n.name) !== null) {
				refs.push(n.name);
			}
		}
	}
	const lists: string[] = [];
	for (const name of refs) {
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
	if (refs.length > 0) {
		c.warn(
			'code-node-reference',
			'The code reads other nodes; `.item` gives their first item and `.itemMatching(k)` pairs by position.',
		);
	}
	const usesExecution = user.includes('$execution');
	const globals: string[] = [];
	if (usesExecution) globals.push('$execution: ctx.execution()');
	if (user.includes('$workflow')) {
		const { workflowId, workflowName } = c.scope;
		globals.push(`$workflow: { id: ${str(workflowId)}, name: ${str(workflowName)}, active: true }`);
	}
	if (user.includes('$runIndex')) globals.push(`$runIndex: ${c.runIndex}`);
	if (user.includes('$executionId')) globals.push('$executionId: ctx.execution().id');
	if (user.includes('$prevNode')) globals.push(`$prevNode: ${prevNode(c)}`);
	// The prologue defines `$`, `$node`, `$items` and `$item` when the code reads them.
	const context =
		refs.length > 0 || globals.length > 0 || /\$items\b|\$item\b|\$\(|\$node\b/.test(user);
	const legacyFunction = type === 'n8n-nodes-base.function';
	const body = eachItem
		? eachItemCode(user, context, functionItem)
		: allItemsCode(user, context, legacyFunction);
	if (c.node.retryOnFail)
		c.warn('retry', 'Code steps have no retry policy; the setting is dropped.');
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
	if (c.node.retryOnFail)
		c.warn('retry', 'Code steps have no retry policy; the setting is dropped.');
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
