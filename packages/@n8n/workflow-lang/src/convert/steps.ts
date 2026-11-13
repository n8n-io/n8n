/**
 * Lowering of nodes that become durable steps: `ctx.node` calls to the
 * compiled node library or to the fallback host, and `ctx.code` calls.
 *
 * Choice for expressions in the parameters of a step: the generated code
 * evaluates them before the call, so the step gets plain values. When a
 * parameter depends on the item, the node runs once for each item, as a v1
 * node evaluates its parameters for each item. An expression that does not
 * translate goes to the fallback host as raw text only when the host gives it
 * the same value (it reads only the item and built-in functions); else the
 * conversion of the node fails.
 */
import type { Code } from './code.ts';
import { literal, raw, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import type { Failure, TranslatedValue } from './expression.ts';
import { hostSafety, INDEX, isExpression, ITEM } from './expression.ts';
import { isRecord } from './types.ts';

export interface StepCall {
	method: 'node' | 'code';
	/** Options of the call without `name` and `items`. */
	fields: Array<[string, Code]>;
	/** True when the options read the current item. */
	perItem: boolean;
	/** True when the options read the item index. */
	usesIndex: boolean;
	/** Extra items after the input items (code steps that read other nodes). */
	extraItems?: string;
	/**
	 * A host node under "continue on fail": the host gives `[{ items }, { nodeError? }]`, and
	 * the source traces the error of a failure of the whole node, as v1 records it.
	 */
	reportError?: boolean;
	/**
	 * The node fails as a whole and gives ONE item `{ error }` under "continue on fail"
	 * (a Code node in "all items" mode catches its own error so), not one for each input item.
	 */
	oneErrorItem?: boolean;
	/**
	 * With `oneErrorItem` under "continue (using error output)": the error item pairs with
	 * the input item, so v1 (`handleNodeErrorOutput`) merges it into the input item when the
	 * input has one item. A Code node gives items without paired items, so it does not.
	 */
	pairedErrorItem?: boolean;
}

/** Fails the node when a raw expression would not give the v1 value in the host. */
export function checkRawFailures(c: NodeContext, failures: Failure[], perItem: boolean): void {
	for (const f of failures) {
		const issue = f.issues.map((i) => i.feature).join(', ');
		if (f.hostSafety === 'none' || (perItem && f.hostSafety === 'batch')) {
			throw new NodeFailure(
				'expression',
				`The expression \`${f.expression.slice(0, 120)}\` does not translate (${issue}), and the fallback host cannot evaluate it either.`,
				f.path,
				f.issues[0]?.feature,
			);
		}
		c.warn(
			'raw-expression',
			`The expression does not translate (${issue}). The fallback host evaluates it.`,
			f.path,
		);
	}
}

/**
 * "Retry on fail" of v1 for a node that gives an error item: v1 runs the node again while
 * the first item of its first output has an `error` (not undefined, null or false), with
 * `min(5, max(2, maxTries || 3))` tries and `waitBetweenTries` (0 to 5000 ms, default
 * 1000) between them. A failure that throws is the retry policy of the step (`retry`).
 */
export function errorRetry(c: NodeContext): { tries: number; delay: number } | null {
	if (c.node.retryOnFail !== true) return null;
	return {
		tries: Math.min(5, Math.max(2, c.node.maxTries || 3)),
		delay: Math.min(5000, Math.max(0, c.node.waitBetweenTries || 1000)),
	};
}

/**
 * Emits one call of a step into `target` (declared with `declare`, for example
 * `let result: Json`). With {@link errorRetry}, the call runs in a loop: the step has
 * one call site, and the loop runs it again while `first` (the first item of the first
 * output) has an error.
 */
export function emitCall(
	c: NodeContext,
	target: string,
	declare: string | null,
	fn: string,
	opts: Code,
	first: string,
): void {
	const { w } = c;
	const retry = errorRetry(c);
	if (!retry) {
		const head = `${declare ?? target} = await ${fn}(`;
		w.block(`${head}${c.print(opts, head)});`);
		return;
	}
	c.helper('retryError');
	// The loop is v1's retry loop for both cases: a node that throws (also a library node that
	// throws after an HTTP status error) and a node that gives an error item. So the call has
	// no retry policy of its own, and the tries are not counted twice.
	const call: Code =
		opts.kind === 'object'
			? { kind: 'object', entries: opts.entries.filter(([k]) => k !== 'retry') }
			: opts;
	if (declare) w.line(`${declare} = [];`);
	w.open(`for (let tryIndex = 0; tryIndex < ${retry.tries}; tryIndex++) {`);
	if (retry.delay > 0) {
		w.line(
			`if (tryIndex > 0) await ctx.wait({ name: ${str(`${c.node.name} (retry)`)}, duration: ${retry.delay} });`,
		);
	}
	// Under "continue (using error output)" the node itself catches the failure and moves the
	// item to the error output, so v1 sees no failure and does not run the node again.
	const onError =
		c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
	if (onError === 'continueErrorOutput') {
		w.block(`${target} = await ${fn}(${c.print(call, `${target} = await ${fn}(`)});`);
		w.line(`if (!retryError(${first})) break;`);
		w.close();
		return;
	}
	w.line('let failed = false;');
	w.open('try {');
	w.block(`${target} = await ${fn}(${c.print(call, `${target} = await ${fn}(`)});`);
	w.close('} catch (error) {');
	w.depth++;
	w.line(`if (tryIndex + 1 >= ${retry.tries}) throw error;`);
	w.line('failed = true;');
	w.close();
	w.line(`if (!failed && !retryError(${first})) break;`);
	w.close();
}

/** Traces the error that the host gives for a failure of the whole node (`reportError`). */
function nodeErrorTrace(c: NodeContext): void {
	c.w.line('const last: Json = result[result.length - 1] ?? {};');
	c.w.line(
		`if (typeof last.nodeError === 'string') ctx.trace(${str(c.node.name)}, { $error: { message: last.nodeError, description: '' } });`,
	);
}

function options(c: NodeContext, call: StepCall, items: string): Code {
	const entries: Array<[string, Code]> = [['name', raw(str(c.node.name))], ...call.fields];
	if (call.reportError) entries.push(['outputs', raw(str('all'))], ['reportError', raw('true')]);
	entries.push(['items', raw(items)]);
	return { kind: 'object', entries };
}

/**
 * Emits the call and declares output 0 (and the error output when the node
 * has `onError: continueErrorOutput`).
 */
export function emitStep(c: NodeContext, call: StepCall): void {
	const { w, input } = c;
	const onError =
		c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
	const out = c.output(0);
	const errors = onError === 'continueErrorOutput' ? c.output(1, 'Errors') : null;
	const fn = call.method === 'node' ? 'ctx.node' : 'ctx.code';
	if (errors) w.line(`const ${errors}: Json[] = [];`);

	if (!call.perItem) {
		const items = call.extraItems ? `[...${input}, ${call.extraItems}]` : input;
		const opts = options(c, call, items);
		if (onError === 'stopWorkflow' && !c.traceAll && !errorRetry(c)) {
			w.block(
				`const ${out}: Json[] = ${input}.length > 0 ? await ${fn}(${c.print(opts, `const ${out}: Json[] = ${input}.length > 0 ? await ${fn}(`)}) : [];`,
			);
			return;
		}
		if (onError === 'stopWorkflow' && !c.traceAll) {
			w.line(`let ${out}: Json[] = [];`);
			w.open(`if (${input}.length > 0) {`);
			emitCall(c, out, null, fn, opts, `${out}[0]`);
			w.close();
			return;
		}
		if (onError === 'stopWorkflow') {
			w.line(`let ${out}: Json[] = [];`);
			w.open(`if (${input}.length > 0) {`);
			w.open('try {');
			emitCall(c, out, null, fn, opts, `${out}[0]`);
			failTrace(c);
			w.close();
			return;
		}
		w.line(`let ${out}: Json[] = [];`);
		w.open(`if (${input}.length > 0) {`);
		w.open('try {');
		if (call.reportError) {
			emitCall(c, 'result', 'let result: Json', fn, opts, 'result[0]?.items?.[0]');
			w.line(`${out} = result[0]?.items ?? [];`);
			nodeErrorTrace(c);
		} else {
			emitCall(c, out, null, fn, opts, `${out}[0]`);
		}
		w.close('} catch (error) {');
		w.depth++;
		if (call.oneErrorItem && errors && call.pairedErrorItem) {
			w.line(
				`${errors}.push(${input}.length === 1 ? { ...${input}[0], error: error.message } : { error: error.message });`,
			);
		} else if (call.oneErrorItem) {
			// As v1's Code node: one item with the message, on the error output when there is one.
			w.line(`${errors ?? out}.push({ error: error.message });`);
		} else if (errors) {
			w.line(`for (const ${ITEM} of ${input}) ${errors}.push(${errorOutputItem(c)});`);
		} else {
			w.line(`${out} = ${input}.map(() => (${errorItem(c)}));`);
		}
		w.close();
		w.close();
		return;
	}

	w.line(`const ${out}: Json[] = [];`);
	if (call.usesIndex) {
		w.open(`for (let ${INDEX} = 0; ${INDEX} < ${input}.length; ${INDEX}++) {`);
		w.line(`const ${ITEM} = ${input}[${INDEX}];`);
	} else {
		w.open(`for (const ${ITEM} of ${input}) {`);
	}
	const opts = options(c, call, `[${ITEM}]`);
	if (onError === 'stopWorkflow' && c.traceAll) {
		w.open('try {');
		emitCall(c, 'result', 'let result: Json[]', fn, opts, 'result[0]');
		w.line(`for (const r of result) ${out}.push(r);`);
		failTrace(c);
	} else if (onError === 'stopWorkflow') {
		emitCall(c, 'result', 'let result: Json[]', fn, opts, 'result[0]');
		w.line(`for (const r of result) ${out}.push(r);`);
	} else {
		w.open('try {');
		emitCall(
			c,
			'result',
			call.reportError ? 'let result: Json' : 'let result: Json[]',
			fn,
			opts,
			call.reportError ? 'result[0]?.items?.[0]' : 'result[0]',
		);
		if (call.reportError) {
			w.line(`for (const r of result[0]?.items ?? []) ${out}.push(r);`);
			nodeErrorTrace(c);
		} else {
			w.line(`for (const r of result) ${out}.push(r);`);
		}
		w.close('} catch (error) {');
		w.depth++;
		w.line(errors ? `${errors}.push(${errorOutputItem(c)});` : `${out}.push(${errorItem(c)});`);
		w.close();
	}
	w.close();
}

/**
 * The item that a node gives for an item that failed under "continue on fail", as the
 * v1 node makes it in its own catch: most nodes give `{ error }`; Airtable gives
 * `{ message, error }`.
 */
const ERROR_ITEMS: Record<string, string> = {
	'n8n-nodes-base.airtable': '{ message: error.message, error: { message: error.message } }',
};

function errorItem(c: NodeContext): string {
	return ERROR_ITEMS[c.node.type] ?? '{ error: error.message }';
}

/**
 * Nodes whose v1 router catches a failure for the whole node and gives one error item
 * without a paired item (`{ json: input[0].json, error }`): v1 does not merge it into an
 * input item, so the error output has `{ error }` only.
 */
const UNPAIRED_ERROR_ITEMS = new Set(['n8n-nodes-base.googleSheets']);

/** An item of the error output: the input item with the error item of the node, as v1 merges them. */
function errorOutputItem(c: NodeContext): string {
	if (UNPAIRED_ERROR_ITEMS.has(c.node.type)) return '{ error: error.message }';
	const own = ERROR_ITEMS[c.node.type];
	return own ? `{ ...${ITEM}, ...${own} }` : `{ ...${ITEM}, error: error.message }`;
}

/**
 * Closes a `try` block with a catch that traces the error of the node (`{ $error }`) and
 * throws it again. The run data of v1 has the failed node with its error, also when the
 * node is a library node that fails inside the run, without a failed step event.
 */
function failTrace(c: NodeContext): void {
	const { w } = c;
	w.close('} catch (error) {');
	w.depth++;
	w.line(
		`ctx.trace(${str(c.node.name)}, { $error: { message: error.message, description: error.description ?? '' } });`,
	);
	w.line('throw error;');
	w.close();
}

/** The workflow settings that a node in the fallback host needs (the time zone of `$now`). */
export function settingsField(c: NodeContext): Array<[string, Code]> {
	const zone = c.scope.timezone;
	if (!zone) return [];
	return [['settings', { kind: 'object', entries: [['timezone', raw(str(zone))]] }]];
}

/** Builds the `ctx.node` call of a node from translated parameters. */
export function nodeCall(
	c: NodeContext,
	type: string,
	parameters: TranslatedValue,
	credential: string | undefined,
	forcePerItem: boolean,
): StepCall {
	const fields: Array<[string, Code]> = [
		['type', raw(str(type))],
		['typeVersion', literal(c.version)],
		['parameters', parameters.code],
	];
	if (credential !== undefined) fields.push(['credential', raw(str(credential))]);
	const retry = c.retry();
	if (retry) fields.push(['retry', retry]);
	return {
		method: 'node',
		fields,
		perItem: forcePerItem || parameters.usage.item || parameters.usage.index,
		usesIndex: parameters.usage.index,
	};
}

/** A node that runs in the fallback host with its v1 parameters. */
/**
 * Parameters that the v1 node reads as raw expression text (`node.parameters`) and
 * resolves itself, for each item: the converter passes them as they are.
 */
const RAW_PARAMETERS: Record<string, string[][]> = {
	'n8n-nodes-base.postgres': [['options', 'queryReplacement']],
	'n8n-nodes-base.mySql': [['options', 'queryReplacement']],
};

/** Puts the raw text of `path` back into translated parameters. */
function putRaw(code: Code, path: string[], text: string): void {
	if (code.kind !== 'object') return;
	const [key, ...rest] = path;
	if (key === undefined) return;
	if (rest.length === 0) {
		code.entries = code.entries.filter(([k]) => k !== key);
		code.entries.push([key, raw(str(text))]);
		return;
	}
	const inner = code.entries.find(([k]) => k === key)?.[1];
	if (inner) putRaw(inner, rest, text);
}

/**
 * Text that the node evaluates itself, for each item (`{{ }}` without a leading `=`):
 * the query of the database nodes. When it reads other nodes, the host needs their run data.
 */
const SELF_EVALUATED: Record<string, string[][]> = {
	'n8n-nodes-base.postgres': [['query'], ['options', 'queryReplacement']],
	'n8n-nodes-base.mySql': [['query'], ['options', 'queryReplacement']],
};

/**
 * Operations that v1 runs once over all items with one result (Sheets delete gives one
 * `{ success: true }`). One host call for each item would give one result for each item.
 */
const ONE_RESULT: Record<string, string[]> = {
	'n8n-nodes-base.googleSheets': ['delete'],
};

/**
 * A run once for each item of an operation in `ONE_RESULT` would give one result for each
 * item. The escape of the generator runs the node once, in the host, with the run data it reads.
 */
export function checkOneResult(c: NodeContext, perItem: boolean): void {
	if (perItem && ONE_RESULT[c.node.type]?.includes(String(c.parameters.operation))) {
		throw new NodeFailure(
			'expression',
			'The operation gives one result for all items, and its parameters read the items.',
			'operation',
		);
	}
}

export function lowerFallback(c: NodeContext): void {
	for (const path of SELF_EVALUATED[c.node.type] ?? []) {
		let v: unknown = c.parameters;
		for (const k of path) v = isRecord(v) ? v[k] : undefined;
		if (typeof v === 'string' && v.includes('{{') && /\$\(|\$node\b|\$items\b/.test(v)) {
			// The escape of the generator runs the node in the host with the run data it reads.
			throw new NodeFailure(
				'expression',
				'The node evaluates `{{ }}` in its own text, and the text reads other nodes.',
				path.join('.'),
			);
		}
	}
	const rawPaths = (RAW_PARAMETERS[c.node.type] ?? []).filter((path) => {
		let v: unknown = c.parameters;
		for (const k of path) v = isRecord(v) ? v[k] : undefined;
		// The host has no run data here, so text that reads other nodes is translated instead.
		return typeof v === 'string' && !/\$\(|\$node\b|\$items\b/.test(v);
	});
	let input: unknown = c.parameters;
	if (rawPaths.length > 0) {
		input = structuredClone(c.parameters);
		for (const path of rawPaths) {
			let v: unknown = input;
			for (const k of path.slice(0, -1)) v = isRecord(v) ? v[k] : undefined;
			if (isRecord(v)) delete v[path[path.length - 1]];
		}
	}
	// Expressions that the host can evaluate stay n8n expressions, as for whole host nodes:
	// n8n's engine gives their v1 values (undefined stays undefined, Luxon stays Luxon).
	const parameters = hostParameters(c, input, '');
	for (const path of rawPaths) {
		let v: unknown = c.parameters;
		for (const k of path) v = isRecord(v) ? v[k] : undefined;
		if (typeof v === 'string') putRaw(parameters.code, path, v);
	}
	const perItem = parameters.usage.item || parameters.usage.index;
	checkOneResult(c, perItem);
	checkRawFailures(c, parameters.failures, perItem);
	if (parameters.usage.approximate) {
		c.warn('paired-item', 'An expression pairs items of another node by position.');
	}
	c.markFallback();
	const call = nodeCall(c, c.node.type, parameters, c.credential(), false);
	call.fields.push(...settingsField(c));
	// The node handles `continueRegularOutput` itself, for each item, as in v1
	// (`this.continueOnFail()`); the catch of `emitStep` is for failures of the host.
	if (
		c.node.onError === 'continueRegularOutput' ||
		(c.node.onError === undefined && c.node.continueOnFail)
	) {
		call.fields.push(['onError', raw(str('continueRegularOutput'))]);
		if (c.traceAll) call.reportError = true;
	}
	emitStep(c, call);
}

/**
 * Variables that only the node itself sets while it runs in the host:
 * `$fromAI(...)` (tool arguments), `$response`, `$request`, `$pageCount`
 * (HTTP Request pagination) and `$agentInfo` (AI Agent).
 */
const FROM_AI = /\$fromai\s*\(|\$response\b|\$request\b|\$pageCount\b|\$agentInfo\b/i;

/**
 * Translates a parameter tree for the host: expressions that the host can
 * evaluate stay as text; the others become code.
 */
export function hostParameters(c: NodeContext, value: unknown, path: string): TranslatedValue {
	const usage: TranslatedValue['usage'] = {
		item: false,
		index: false,
		approximate: false,
		nodes: new Set(),
	};
	const failures: Failure[] = [];
	const walk = (v: unknown, p: string, keepUndefined = false): Code => {
		if (isExpression(v)) {
			if (FROM_AI.test(v) || hostSafety(v) !== 'none') return raw(str(v));
			const t = c.translate(v, p);
			usage.item ||= t.usage.item;
			usage.index ||= t.usage.index;
			usage.approximate ||= t.usage.approximate;
			for (const n of t.usage.nodes) usage.nodes.add(n);
			failures.push(...t.failures);
			if (keepUndefined && t.code.kind === 'raw') {
				c.helper('undefinedToNull');
				return raw(`undefinedToNull(${t.code.text})`);
			}
			return t.code;
		}
		if (Array.isArray(v)) return { kind: 'array', items: v.map((x, i) => walk(x, `${p}[${i}]`)) };
		if (isRecord(v)) {
			// A field of a resource mapper whose expression gives undefined keeps its key: n8n
			// gives the node the key with undefined (Sheets writes ''), and JSON has only null.
			const mapper =
				c.node.type !== 'n8n-nodes-base.executeWorkflow' && /(^|\.)columns\.value$/.test(p);
			return {
				kind: 'object',
				entries: Object.entries(v).map(([k, x]): [string, Code] => [
					k,
					walk(x, p ? `${p}.${k}` : k, mapper),
				]),
			};
		}
		return literal(v);
	};
	return { code: walk(value, path), usage, failures };
}
