/**
 * Execute Workflow → a call of an async function in the same module, and the
 * Execute Workflow Trigger of the callee → the items that the function gets.
 *
 * The converter finds the callee at convert time: by id through
 * `ConvertOptions.resolveWorkflow` (source "database"), or from the JSON in
 * the node (source "parameter"). Each callee becomes one function, so
 * recursion and cycles between workflows are calls. A callee that the
 * converter cannot find (an id that the resolver does not know, an id from an
 * expression, a local file or a URL) stays a `ctx.node` step: the fallback
 * host runs the v1 node, which must ask n8n to run the sub-workflow.
 *
 * Semantics (`ExecuteWorkflow.node.ts`, `getRunData` in the n8n CLI):
 * - The input items get the "workflow inputs" values of the node (version 1.2
 *   and later), and lose the fields that the mapping marks as removed.
 * - The callee starts at its Execute Workflow Trigger (else a manual trigger)
 *   with these items. The trigger keeps the fields that it defines.
 * - Mode "once" runs the callee once with all items; mode "each" runs it once
 *   for each item. The node gives the items of the last node that ran in the
 *   callee.
 * - `waitForSubWorkflow: false`: v1 starts the callee and gives the input
 *   items at once. The converted code runs the callee to its end first and
 *   ignores its errors. The items are the same; the callee's effects come
 *   before the effects of the nodes after this one (in v1 they can overlap).
 */
import type { Code } from './code.ts';
import { raw, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { INDEX, isExpression, ITEM } from './expression.ts';
import { lowerFallback } from './steps.ts';
import type { N8nNode } from './types.ts';
import { isRecord, text } from './types.ts';

const BASE = 'n8n-nodes-base.';

export type Callee =
	| { kind: 'function'; key: string; workflow: unknown; label: string }
	| { kind: 'host'; reason: string };

/** Finds the callee of an Execute Workflow node at convert time. */
export function resolveCallee(
	node: N8nNode,
	resolve: ((id: string) => unknown) | undefined,
): Callee {
	const p = node.parameters ?? {};
	const source = text(p.source, 'database');
	if (source === 'database') {
		const ref = p.workflowId;
		const value = isRecord(ref) ? ref.value : ref;
		if (typeof value !== 'string' && typeof value !== 'number') {
			return { kind: 'host', reason: 'The node names no workflow id.' };
		}
		const id = String(value);
		if (id.startsWith('=')) {
			return { kind: 'host', reason: 'The workflow id is an expression.' };
		}
		const workflow = resolve?.(id);
		if (workflow === undefined || workflow === null) {
			return {
				kind: 'host',
				reason: `The workflow "${id}" is not known when the workflow converts.`,
			};
		}
		const cached =
			isRecord(ref) && typeof ref.cachedResultName === 'string' ? ref.cachedResultName : '';
		return { kind: 'function', key: `id:${id}`, workflow, label: cached || `Workflow ${id}` };
	}
	if (source === 'parameter') {
		const json = p.workflowJson;
		if (typeof json === 'string' && json.startsWith('=')) {
			return { kind: 'host', reason: 'The workflow JSON is an expression.' };
		}
		let workflow: unknown = json;
		if (typeof json === 'string') {
			try {
				workflow = JSON.parse(json);
			} catch {
				return { kind: 'host', reason: 'The workflow JSON is not valid JSON.' };
			}
		}
		if (!isRecord(workflow)) return { kind: 'host', reason: 'The workflow JSON is not an object.' };
		const name = typeof workflow.name === 'string' ? workflow.name : `${node.name} workflow`;
		return { kind: 'function', key: `json:${JSON.stringify(workflow)}`, workflow, label: name };
	}
	if (source === 'localFile') {
		return { kind: 'host', reason: 'The workflow comes from a local file.' };
	}
	if (source === 'url') {
		return { kind: 'host', reason: 'The workflow comes from a URL.' };
	}
	return { kind: 'host', reason: `The workflow source "${source}" is not known.` };
}

/** The node where a sub-workflow starts, as `findSubworkflowStart` of the n8n CLI picks it. */
export function findSubworkflowStart(nodes: N8nNode[]): N8nNode | undefined {
	return (
		nodes.find((n) => n.type === `${BASE}executeWorkflowTrigger`) ??
		nodes.find(
			(n) =>
				n.type === '@n8n/n8n-nodes-langchain.manualChatTrigger' ||
				n.type === `${BASE}manualTrigger`,
		)
	);
}

/**
 * The code of the items that the start node of a callee gives, from the
 * function parameter `items`. Execute Workflow Trigger 1.1 and later keep
 * the fields that the trigger defines; a missing field is `null`.
 */
export function calleeTriggerItems(
	trigger: N8nNode,
	items: string,
): { code: string; helper?: string } {
	if (trigger.type !== `${BASE}executeWorkflowTrigger` || trigger.disabled) return { code: items };
	const p = trigger.parameters ?? {};
	if ((trigger.typeVersion ?? 1) < 1.1) return { code: items };
	const mode = text(p.inputSource, 'workflowInputs');
	if (mode === 'passthrough') return { code: items };
	let fields: string[] = [];
	if (mode === 'jsonExample') {
		try {
			const example: unknown = JSON.parse(text(p.jsonExample, '{}'));
			if (isRecord(example)) fields = Object.keys(example);
		} catch {
			fields = [];
		}
	} else {
		const values =
			isRecord(p.workflowInputs) && Array.isArray(p.workflowInputs.values)
				? p.workflowInputs.values
				: [];
		fields = values.filter(isRecord).map((v) => text(v.name, ''));
	}
	return {
		code: `pickInputs(${items}, [${fields.map(str).join(', ')}])`,
		helper: 'pickInputs',
	};
}

/** Execute Workflow → a call of the callee function, or a fallback-host step. */
export function lowerExecuteWorkflow(c: NodeContext): void {
	const call = c.subWorkflow();
	if (call.kind === 'host') {
		c.warn(
			'sub-workflow-host',
			`${call.reason} The fallback host runs the node; it must ask n8n to run the sub-workflow.`,
		);
		lowerFallback(c);
		return;
	}
	const p = c.parameters;
	const w = c.w;
	const opts = isRecord(p.options) ? p.options : {};
	const mode = text(p.mode, 'once');
	const wait = opts.waitForSubWorkflow !== false;
	if (opts.waitForSubWorkflow !== undefined && typeof opts.waitForSubWorkflow !== 'boolean') {
		c.warn(
			'sub-workflow',
			'The "wait for sub-workflow" option is an expression; the converted code waits.',
		);
	}
	if (!wait) {
		c.info(
			'sub-workflow-no-wait',
			'v1 does not wait for the sub-workflow. The converted code runs it to its end first and ignores its errors.',
		);
	}
	const out = c.output(0);

	// The input items with the "workflow inputs" values (version 1.2 and later).
	const mapping = isRecord(p.workflowInputs) ? p.workflowInputs : {};
	const values = isRecord(mapping.value) ? mapping.value : {};
	const schema = Array.isArray(mapping.schema) ? mapping.schema.filter(isRecord) : [];
	const removed = schema
		.filter((s) => s.removed === true)
		.map((s) => text(s.displayName ?? s.id, ''))
		.filter((s) => s !== '');
	let items = c.input;
	const entries: Array<[string, Code]> = [];
	let usesIndex = false;
	// n8n's resource mapper makes a null value of a field with a type undefined, so the
	// key leaves the item (`validateResourceMapperValue`).
	const typed = schema.filter((s) => typeof s.type === 'string').map((s) => text(s.id, ''));
	for (const [key, value] of Object.entries(values)) {
		const t = c.compiled(value, `workflowInputs.value.${key}`);
		usesIndex ||= t.usage.index;
		const code =
			typed.includes(key) && isExpression(value) && t.code.kind === 'raw'
				? raw(`nullToUndefined(${t.code.text})`)
				: t.code;
		if (code !== t.code) c.helper('nullToUndefined');
		entries.push([key, code]);
	}
	if (entries.length > 0 || removed.length > 0) {
		items = c.local('Inputs');
		const obj: Code = { kind: 'object', entries: [['...', raw(ITEM)], ...entries] };
		const params = usesIndex ? `(${ITEM}: Json, ${INDEX}: number)` : `(${ITEM}: Json)`;
		const mapped = `${c.input}.map(${params} => (${c.print(obj, `const ${items}: Json[] = ${c.input}.map(${params} => (`)}))`;
		if (removed.length > 0) {
			c.helper('omitKeys');
			w.block(`const ${items}: Json[] = omitKeys(${mapped}, [${removed.map(str).join(', ')}]);`);
		} else {
			w.block(`const ${items}: Json[] = ${mapped};`);
		}
	}
	const onError =
		c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
	// The error output is output 1 of the node.
	const errors = onError === 'continueErrorOutput' ? c.output(1, 'Errors') : null;
	w.comment(
		`Runs the sub-workflow "${call.workflowName}" ${mode === 'each' ? 'once for each item' : 'once with all items'}.`,
	);
	w.line(`const ${out}: Json[] = [];`);
	if (errors) w.line(`const ${errors}: Json[] = [];`);
	w.open(`if (${c.input}.length > 0) {`);
	const run = (list: string, target: string) => {
		if (!wait) {
			w.open('try {');
			w.line(`await ${call.fn}(${list});`);
			w.close('} catch (error) {');
			w.depth++;
			w.comment('v1 does not wait for the sub-workflow, so its errors do not stop this workflow.');
			w.close();
			w.line(`for (const r of ${list}) ${target}.push(r);`);
			return;
		}
		if (onError === 'stopWorkflow') {
			w.line(`for (const r of (await ${call.fn}(${list}))[0] ?? []) ${target}.push(r);`);
			return;
		}
		w.open('try {');
		w.line(`for (const r of (await ${call.fn}(${list}))[0] ?? []) ${target}.push(r);`);
		w.close('} catch (error) {');
		w.depth++;
		if (errors) w.line(`for (const r of ${list}) ${errors}.push({ ...r, error: error.message });`);
		else w.line(`${target}.push({ error: error.message });`);
		w.close();
	};
	if (mode === 'each') {
		w.open(`for (const item of ${items}) {`);
		run('[item]', out);
		w.close();
	} else {
		run(items, out);
	}
	w.close();
}
