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
import type { PublicCredential } from '../credentials/public.ts';
import {
	compileNodeInstance,
	callsOnce,
	deferredVerified,
	pairsAsV1,
	errorItemsByPosition,
	flagGuard,
	unverifiedConditions,
	valueAtPath,
	verifiedFlagKeys,
} from '../node-compile/convert.ts';
import { CORE_NODE_TYPES } from './core-types.ts';
import type { Code } from './code.ts';
import { literal, print, raw, str, Writer } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import type { Failure, TranslatedValue } from './expression.ts';
import { hostSafety, INDEX, isExpression, ITEM, neverThrows } from './expression.ts';
import { stripNoDataExpressions } from './node-parameters.ts';
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
	 * A compiled node that stores responses: an error that says that the fallback host can run
	 * the node (`fileLimitInHost`) is not tried again and not traced. The caller runs the host form.
	 */
	hostLimit?: boolean;
	/**
	 * With `oneErrorItem` under "continue (using error output)": the error item pairs with
	 * the input item, so v1 (`handleNodeErrorOutput`) merges it into the input item when the
	 * input has one item. A Code node gives items without paired items, so it does not.
	 */
	pairedErrorItem?: boolean;
	/**
	 * The v1 node pairs each output item with the input item of its run (`itemData: { item }`
	 * for each result and for the error item). The step then keeps the index of the input item
	 * of each item of output 0, for `$('Node').item` in a later node.
	 */
	pairsByCall?: boolean;
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
	return errorRetryOf(c.node);
}

/** `errorRetry` for the settings of a node. */
export function errorRetryOf(node: {
	retryOnFail?: boolean;
	maxTries?: number;
	waitBetweenTries?: number;
}): { tries: number; delay: number } | null {
	if (node.retryOnFail !== true) return null;
	return {
		tries: Math.min(5, Math.max(2, node.maxTries || 3)),
		delay: Math.min(5000, Math.max(0, node.waitBetweenTries || 1000)),
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
	hostLimit = false,
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
	w.line(
		`if (tryIndex + 1 >= ${retry.tries}${hostLimit ? ' || fileLimitInHost(error)' : ''}) throw error;`,
	);
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
	// Without an error setting, output 0 only ever holds results of the step, and the result
	// of an effect is JSON (spec 4.5).
	if (onError === 'stopWorkflow') c.plainLists?.add(out);
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
			emitCall(c, out, null, fn, opts, `${out}[0]`, call.hostLimit);
			w.close();
			return;
		}
		if (onError === 'stopWorkflow') {
			w.line(`let ${out}: Json[] = [];`);
			w.open(`if (${input}.length > 0) {`);
			w.open('try {');
			emitCall(c, out, null, fn, opts, `${out}[0]`, call.hostLimit);
			failTrace(c, call.hostLimit);
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
	// The index of the input item of each item of output 0 (`paired`), as a compiled node gives it.
	const pairs =
		call.pairsByCall === true &&
		c.pairsWanted === true &&
		c.setPairs !== undefined &&
		!errorRetry(c)
			? `${out}Pairs`
			: null;
	if (pairs) {
		w.line(`const ${pairs}: Json = { items: ${out}, paired: [] };`);
		c.setPairs?.(pairs);
	}
	const push = (value: string) =>
		pairs ? `{ ${out}.push(${value}); ${pairs}.paired.push(${INDEX}); }` : `${out}.push(${value});`;
	if (call.usesIndex || pairs) {
		w.open(`for (let ${INDEX} = 0; ${INDEX} < ${input}.length; ${INDEX}++) {`);
		w.line(`const ${ITEM} = ${input}[${INDEX}];`);
	} else {
		w.open(`for (const ${ITEM} of ${input}) {`);
	}
	const opts = options(c, call, `[${ITEM}]`);
	if (onError === 'stopWorkflow' && c.traceAll) {
		w.open('try {');
		emitCall(c, 'result', 'let result: Json[]', fn, opts, 'result[0]', call.hostLimit);
		w.line(`for (const r of result) ${push('r')}`);
		failTrace(c, call.hostLimit);
	} else if (onError === 'stopWorkflow') {
		emitCall(c, 'result', 'let result: Json[]', fn, opts, 'result[0]', call.hostLimit);
		w.line(`for (const r of result) ${push('r')}`);
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
			w.line(`for (const r of result) ${push('r')}`);
		}
		w.close('} catch (error) {');
		w.depth++;
		w.line(errors ? `${errors}.push(${errorOutputItem(c)});` : push(errorItem(c)));
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
function failTrace(c: NodeContext, hostLimit = false): void {
	const { w } = c;
	w.close('} catch (error) {');
	w.depth++;
	if (hostLimit) w.line('if (fileLimitInHost(error)) throw error;');
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

/**
 * Writes the node as a call of a module that is compiled from the node source.
 * Returns false when there is no source or it does not compile: the caller then
 * runs the node in the fallback host.
 */
export function tryCompiledNode(c: NodeContext): boolean {
	if (!c.nodeSources || !c.addNode) return false;
	const lines = c.w.length;
	const depth = c.w.depth;
	try {
		return compiledNode(c);
	} catch (error) {
		// A failure of the lowering (an expression that does not translate) is for the caller.
		if (error instanceof NodeFailure) throw error;
		// An error of the node compiler is the error of this node only: the node runs in the
		// host, and the other nodes of the workflow keep their compiled forms.
		c.w.truncate(lines, depth);
		c.info(
			'node-compile',
			`The node source does not compile: ${error instanceof Error ? error.message : String(error)}`,
		);
		return false;
	}
}

function compiledNode(c: NodeContext): boolean {
	if (!c.nodeSources || !c.addNode) return false;
	// A core node that has a native form reaches the host only when that form does not fit
	// (an expression that does not translate). Its source is not a better form.
	if (CORE_NODE_TYPES.has(c.node.type)) return false;
	// The node code is compiled for the error setting of the node (`this.continueOnFail()`), and
	// an operation runs compiled only under the settings that are checked against the v1 node.
	const onError =
		c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
	// The caller knows that the credential of this node gives its conditions values that were
	// not checked against the v1 node together: the node runs in the host, as in v1.
	if (c.nodeSources.runsInHost?.(c.node.name) === true) {
		c.info(
			'node-compile',
			'The credential of the node gives its conditions values that are not checked against the v1 node.',
		);
		return false;
	}
	const credentials: Record<string, PublicCredential> = {};
	for (const [type, bound] of Object.entries(c.node.credentials ?? {})) {
		const found = c.nodeSources.publicCredential?.(type, bound?.id ?? null);
		if (found) credentials[type] = found;
	}
	const sources = c.nodeSources;
	let paired = false;
	const compileWith = (deferred: string[]) =>
		compileNodeInstance(
			sources,
			{ type: c.node.type, version: c.version, parameters: c.parameters },
			c.instance?.id,
			credentials,
			c.scope.timezone,
			{
				// The facts that are constant when the workflow is published (`this.getWorkflow().id`,
				// `this.getInstanceBaseUrl()`).
				...(c.scope.workflowId === '' ? {} : { workflow: { id: c.scope.workflowId } }),
				...(c.instance ? { instanceBaseUrl: c.instance.baseUrl } : {}),
			},
			onError,
			deferred,
			paired,
		);
	let compiled = compileWith([]);
	if ('errors' in compiled) {
		c.info('node-compile', `The node source does not compile: ${compiled.errors.join('; ')}`);
		return false;
	}
	// v1 runs the node once with all items. Under a "continue" setting the module runs once
	// too when the check against v1 proved that form (`emitContinueOnce`). With the error
	// output, the module then gives the paired item of each output item.
	const once = callsOnce(sources, c.node.type, c.version, compiled.resolved, onError);
	// A later node reads the item of an earlier node through this node (`$('Node').item`):
	// the module gives the paired item of each output item, when the check against v1 proved
	// that they are the paired items of the v1 node.
	const lineage =
		onError === 'stopWorkflow' &&
		c.pairsWanted === true &&
		c.setPairs !== undefined &&
		!errorRetry(c) &&
		pairsAsV1(sources, c.node.type, c.version, compiled.resolved);
	if (
		lineage ||
		(once &&
			onError !== 'stopWorkflow' &&
			pairedOutputOf(onError === 'continueErrorOutput', errorRetry(c)))
	) {
		paired = true;
		compiled = compileWith([]);
		if ('errors' in compiled) {
			c.info('node-compile', `The node source does not compile: ${compiled.errors.join('; ')}`);
			return false;
		}
	}
	// The reference of a compiled node is the v1 node. An operation that was not compared with
	// it runs in the host. A parameter with an expression needs its own check: the v1 node
	// with that parameter as an expression, for several items.
	const unverified = unverifiedConditions(c.nodeSources, c.node.type, c.version, compiled);
	if (unverified.length > 0) {
		c.info(
			'node-compile',
			`The node source compiles, and this operation or one of its parameters is not checked against the v1 node. Conditions without a check: ${unverified.join(', ')}`,
		);
		return false;
	}
	// The compiled forms of binary data are those of the `separate` mode. With `combined`, v1 reads
	// and writes binary data in the JSON of an item, so the node stays in the host.
	if (compiled.binary && c.scope.binaryMode === 'combined') {
		c.info(
			'node-compile',
			'The node uses binary data and the workflow has the binary mode `combined`, which has no compiled form.',
		);
		return false;
	}
	// The module reads a parameter with an expression from a list with one entry for each item
	// (`parameters.each`). An entry has the value of each parameter path that the module reads.
	const resolved = compiled.resolved;
	const values = compiled.itemParameters.map((path) => ({
		path,
		// `path` is a parameter as the module reads it: v1 gives the text of a DateTime below it
		// (`cleanupParameterData`), and keeps a DateTime that is the whole parameter.
		value: c.compiled(valueAtPath(resolved, path), path, {
			flattenResourceLocators: false,
			luxonValue: 'below',
		}),
	}));
	// The node evaluates these expressions itself (`this.evaluateExpression`). v1 gives the
	// DateTime as it is. The node code puts some values in a text (`text.replace`): there the
	// DateTime is its text.
	for (const { path, expression, text } of compiled.evaluated) {
		values.push({
			path,
			value: c.compiled(expression, path, {
				flattenResourceLocators: false,
				luxonValue: text ? 'text' : 'below',
			}),
		});
	}
	// v1 evaluates an expression when the node reads the parameter. The code here evaluates
	// it for all items before the call. So an expression that can throw keeps its error in the
	// entry, and the module throws it at the read (`deferredParameters`).
	const throwing = values.filter((v) => !neverThrows(v.value.code)).map((v) => v.path);
	if (throwing.length > 0) {
		const checked = compileWith(throwing);
		if ('errors' in checked) {
			c.info('node-compile', `The node source does not compile: ${checked.errors.join('; ')}`);
			return false;
		}
		compiled = checked;
		if (!deferredVerified(sources, c.node.type, c.version, compiled)) {
			c.info(
				'node-compile',
				'An expression of a parameter can fail, and the node with a failed expression is not checked against the v1 node.',
			);
			return false;
		}
		c.helper('parameterOrError');
	}
	const valueCode = ({ path, value }: (typeof values)[number]): Code =>
		throwing.includes(path)
			? raw(`parameterOrError(() => (${print(value.code, '', 0, Number.POSITIVE_INFINITY)}))`)
			: value.code;
	const entryOf = (chosen: typeof values): Code => ({
		kind: 'object',
		entries: chosen.map((v): [string, Code] => [v.path, valueCode(v)]),
	});
	const entry = entryOf(values);
	const readsItem = values.some((v) => v.value.usage.item);
	const readsIndex = values.some((v) => v.value.usage.index);
	// A node that asks for the bytes of a response needs a runtime that stores the body as
	// binary data (`responseBinary`, spec 7.1). The caller says when its runtime does.
	if (compiled.storesResponses && c.nodeSources.storesResponses !== true) {
		c.info(
			'node-compile',
			'The node asks for the bytes of a response, and the runtime of the caller does not store a response as binary data.',
		);
		return false;
	}
	// A module asks n8n for a new session token of its credential with a service call, as v1
	// gets one after a failed request (`__requestRenewed`).
	if (c.services === false && /service: ["']credentials["']/.test(compiled.source)) {
		c.info(
			'node-compile',
			'The node asks n8n for a new session token of its credential, and the runtime of the caller has no service calls.',
		);
		return false;
	}
	// A node that stores a response can reach the largest size of a stored file, which v1 does
	// not have: its fallback-host form is in the source too.
	// The host form runs the node again for all items. So the compiled form is one call for all
	// items: a call for each item cannot tell what the calls before it sent.
	if (compiled.marksFileLimit && !lineage && !once) {
		c.info(
			'node-compile',
			'The node stores a response, and under this error setting it has no check of one call for all items.',
		);
		return false;
	}
	const hostForm = compiled.marksFileLimit ? hostFormOf(c) : null;
	if (compiled.marksFileLimit && hostForm === null) {
		c.info(
			'node-compile',
			'The node stores a response, and its fallback-host form has no code in this place.',
		);
		return false;
	}
	if (compiled.derivations.length > 0) {
		const slot = c.credential();
		if (slot === undefined || !c.addCredentialDerivations) {
			c.info(
				'node-compile',
				'The node source needs values from its credential, and the caller does not take them.',
			);
			return false;
		}
		c.addCredentialDerivations(slot, compiled.derivations);
	}
	if (compiled.flags.length > 0) {
		const slot = c.credential();
		if (slot === undefined || !c.addCredentialDerivations) {
			c.info(
				'node-compile',
				'The node source has conditions on its credential, and the caller does not compute them.',
			);
			return false;
		}
		// The guard holds the flag values that were checked against the v1 node together, and the
		// name of the node. n8n gives the flags to the module only for those values. For other
		// values n8n converts again with the node in the host (`NodeSources.runsInHost`).
		const allowed = verifiedFlagKeys(c.nodeSources, c.node.type, c.version, compiled);
		c.addCredentialDerivations(slot, [
			...compiled.flags,
			flagGuard(compiled, allowed, c.node.name),
		]);
	}
	if (compiled.mints.length > 0) {
		const slot = c.credential();
		if (slot === undefined || !c.addCredentialMints) {
			c.info(
				'node-compile',
				'The node source needs a token that n8n makes from its credential, and the caller does not make it.',
			);
			return false;
		}
		c.addCredentialMints(slot, compiled.mints);
	}
	c.addNode(compiled.file, compiled.source);
	for (const zone of compiled.zones) c.scope.useZone?.(zone);
	c.info(
		'node-compiled',
		`The node runs as code that is compiled from its source (${compiled.type}).`,
	);
	// v1 runs the node once with all items, and so does the module: one call, also when a
	// parameter reads the item. The call runs once for each item only under a "continue"
	// setting that has no check of the one call (`emitCompiledContinue`), with a list of one entry.
	const one = !once;
	let each: Code | null = null;
	if (values.length > 0 && one) each = { kind: 'array', items: [entry] };
	else if (values.length > 0) {
		// v1 evaluates an expression for the items that the node reads the parameter for. The
		// compiler knows the parameters that the module reads for the first item only: their
		// expressions run once, and the entries of the other items do not have them.
		const firstOnly = values.filter((v) => compiled.firstItemParameters.includes(v.path));
		const always = values.filter((v) => !compiled.firstItemParameters.includes(v.path));
		const list = c.local('Parameters');
		c.w.line(`const ${list}: Json[] = [];`);
		if (always.length > 0) {
			const item = always.some((v) => v.value.usage.item);
			if (always.some((v) => v.value.usage.index)) {
				c.w.open(`for (let ${INDEX} = 0; ${INDEX} < ${c.input}.length; ${INDEX}++) {`);
				if (item) c.w.line(`const ${ITEM} = ${c.input}[${INDEX}];`);
			} else if (item) c.w.open(`for (const ${ITEM} of ${c.input}) {`);
			else c.w.open(`for (let ${INDEX} = 0; ${INDEX} < ${c.input}.length; ${INDEX}++) {`);
			const head = `${list}.push(`;
			c.w.block(`${head}${c.print(entryOf(always), head)});`);
			c.w.close();
		}
		if (firstOnly.length > 0) {
			c.w.open(
				`for (let ${INDEX} = 0; ${INDEX} < ${c.input}.length && ${INDEX} < 1; ${INDEX}++) {`,
			);
			if (firstOnly.some((v) => v.value.usage.item))
				c.w.line(`const ${ITEM} = ${c.input}[${INDEX}];`);
			if (always.length === 0) {
				const head = `${list}.push(`;
				c.w.block(`${head}${c.print(entryOf(firstOnly), head)});`);
			} else {
				for (const v of firstOnly) {
					const head = `${list}[0][${str(v.path)}] = `;
					c.w.block(`${head}${c.print(valueCode(v), head)};`);
				}
			}
			c.w.close();
		}
		each = raw(list);
	}
	const call = nodeCall(
		c,
		compiled.type,
		{
			code: { kind: 'object', entries: each ? [['each', each]] : [] },
			usage: {
				item: one && readsItem,
				index: one && readsIndex,
				approximate: false,
				nodes: new Set(),
			},
			failures: [],
		},
		c.credential(),
		one,
	);
	const byPosition = errorItemsByPosition(c.nodeSources, c.node.type, c.version, compiled);
	const emitForm = (to: NodeContext, hostLimit: boolean) => {
		if (lineage) emitPairedStep(to, call, null);
		else if (onError === 'stopWorkflow') emitStep(to, { ...call, hostLimit });
		else if (once) {
			const retry = errorRetry(to);
			const fields = retry ? call.fields.filter(([k]) => k !== 'retry') : call.fields;
			const opts = options(to, { ...call, fields }, to.input);
			const helpers = emitContinueOnce(to.w, {
				node: to.node.name,
				out: to.output(0),
				errors: onError === 'continueErrorOutput' ? to.output(1, 'Errors') : null,
				input: to.input,
				call: (head) => to.print(opts, head),
				retry,
				trace: to.traceAll === true,
				hostLimit,
			});
			for (const helper of helpers) to.helper(helper);
		} else {
			emitCompiledContinue(to, call, onError === 'continueErrorOutput', byPosition);
		}
	};
	if (hostForm === null) emitForm(c, false);
	else if (lineage) emitPairedStep(c, call, hostForm);
	else emitWithHostForm(c, onError === 'continueErrorOutput', emitForm, hostForm);
	c.markCompiled?.();
	return true;
}

/** The end of the step name of the fallback-host form of a compiled node. */
export const HOST_STEP = ' (fallback host)';

/** The fallback-host form of a node, written apart from the source, with its own output names. */
export interface HostForm {
	text: string;
	out: string;
	errors: string;
}

/** A context that writes a form of the node with the output names `out` and `errors`. */
function renamed(c: NodeContext, out: string, errors: string): NodeContext {
	return { ...c, output: (index) => (index === 0 ? out : errors) };
}

/** The empty list of answers of a library node that can hand the node over to the host. */
const REPLAY_START = '{ list: [], bytes: 0, full: false }';

/**
 * The two option entries of a list of answers: `compiled` goes into the parameters of the
 * library node, which adds the answer of each GET request. `host` goes into the options of
 * the host step. The list is empty when the answers did not fit (the library node keeps a
 * bounded list): the v1 node then sends each request again.
 */
export function replayOf(name: string): { compiled: [string, Code]; host: [string, Code] } {
	return { compiled: ['replay', raw(name)], host: ['replay', raw(`${name}.list`)] };
}

/**
 * Writes the fallback-host form of a node (the code of `lowerHost`) one level below the
 * current place. Null when the host form has no code here: the caller does not compile the node.
 * `lower` writes the host form of a node that has a library node.
 */
export function hostFormOf(
	c: NodeContext,
	lower: (to: NodeContext) => void = lowerHost,
): HostForm | null {
	const w = new Writer();
	w.depth = c.w.depth + 1;
	const form = { out: c.local('InHost'), errors: c.local('InHostErrors') };
	const to: NodeContext = {
		...renamed(c, form.out, form.errors),
		// A step name is unique in a module. n8n reads this name as a step of the node.
		node: { ...c.node, name: `${c.node.name}${HOST_STEP}` },
		w,
		print: (code, prefix = '') => print(code, w.indent, w.indent.length * 4 + prefix.length),
		warn: () => {},
		markFallback: () => {},
	};
	try {
		lower(to);
	} catch (error) {
		if (error instanceof NodeFailure) return null;
		throw error;
	}
	return { text: w.toString(), ...form };
}

/**
 * Emits a compiled node that stores responses, with its fallback-host form after it. `wfrt`
 * has a largest size for a stored file (`--binary-max-file-mb`) and v1 has none. The module
 * marks the error of that limit when it sent only GET requests (`RUNS_IN_HOST`): v1 can
 * send a GET again. The node then runs in the host, in the same run, as the v1 node.
 *
 * `replay` is the name of the list of answers of the node (`replayOf`): the compiled form
 * adds the answer of each GET request to it, and the host form gives the list to the host
 * step. The host gives each answer to the v1 node, so no request goes out a second time.
 */
export function emitWithHostForm(
	c: NodeContext,
	errorOutput: boolean,
	emitForm: (to: NodeContext, hostLimit: boolean) => void,
	host: HostForm,
	replay?: string,
): void {
	const { w } = c;
	const out = c.output(0);
	const errors = errorOutput ? c.output(1, 'Errors') : null;
	const inHost = c.local('RunsInHost');
	const compiled = renamed(c, c.local('Compiled'), c.local('CompiledErrors'));
	c.helper('fileLimitInHost');
	if (replay !== undefined) w.line(`const ${replay}: Json = ${REPLAY_START};`);
	w.line(`let ${out}: Json[] = [];`);
	if (errors) w.line(`let ${errors}: Json[] = [];`);
	w.line(`let ${inHost} = false;`);
	w.open('try {');
	emitForm(compiled, true);
	w.line(`${out} = ${compiled.output(0)};`);
	if (errors) w.line(`${errors} = ${compiled.output(1)};`);
	w.close('} catch (error) {');
	w.depth++;
	w.line('if (!fileLimitInHost(error)) throw error;');
	w.line(`${inHost} = true;`);
	w.close();
	w.open(`if (${inHost}) {`);
	w.append(host.text.split('\n'));
	w.line(`${out} = ${host.out};`);
	if (errors) w.line(`${errors} = ${host.errors};`);
	w.close();
}

/**
 * Emits one call of a compiled node that gives the paired item of each output item
 * (`{ items, paired }`), and declares output 0. The node stops the workflow when it fails,
 * and has no "retry on fail".
 *
 * With `host`, the node runs in the fallback host when the module marks the error of the file
 * size limit (`emitWithHostForm`). The host gives no paired items, so the run has none: the
 * later node pairs by position, as v1's engine does for a node that gives none.
 */
function emitPairedStep(c: NodeContext, call: StepCall, host: HostForm | null): void {
	const { w, input } = c;
	const run = c.local('Run');
	const empty = '{ items: [], paired: [] }';
	const opts = options(c, call, input);
	if (host) {
		const inHost = c.local('RunsInHost');
		c.helper('fileLimitInHost');
		w.line(`let ${run}: Json = ${empty};`);
		w.line(`let ${inHost} = false;`);
		w.open(`if (${input}.length > 0) {`);
		w.open('try {');
		const head = `${run} = await ctx.node(`;
		w.block(`${head}${c.print(opts, head)});`);
		w.close('} catch (error) {');
		w.depth++;
		w.open('if (!fileLimitInHost(error)) {');
		if (c.traceAll) {
			w.line(
				`ctx.trace(${str(c.node.name)}, { $error: { message: error.message, description: error.description ?? '' } });`,
			);
		}
		w.line('throw error;');
		w.close();
		w.line(`${inHost} = true;`);
		w.close();
		w.close();
		w.open(`if (${inHost}) {`);
		w.append(host.text.split('\n'));
		w.line(`${run} = { items: ${host.out}, paired: ${host.out}.map(() => null) };`);
		w.close();
	} else if (c.traceAll) {
		w.line(`let ${run}: Json = ${empty};`);
		w.open(`if (${input}.length > 0) {`);
		w.open('try {');
		const head = `${run} = await ctx.node(`;
		w.block(`${head}${c.print(opts, head)});`);
		failTrace(c);
		w.close();
	} else {
		const head = `const ${run}: Json = ${input}.length > 0 ? await ctx.node(`;
		w.block(`${head}${c.print(opts, head)}) : ${empty};`);
	}
	w.line(`const ${c.output(0)}: Json[] = ${run}.items;`);
	c.setPairs?.(run);
}

/**
 * Emits a compiled node under "continue on fail" or "continue (using error output)". The
 * module has the node's own handling of a failed item (`this.continueOnFail()` is true in it).
 * This code is the part of v1's engine around the node:
 * - The node runs once for each item. With the error output, the error items move to the
 *   error output, merged into their input item (`handleNodeErrorOutput`). The check against
 *   v1 records how the node pairs its error items: with their input item, or not at all
 *   (`byPosition`: v1 then pairs them by position, `assignPairedItems`).
 * - When the node throws, v1 drops the output of the run and passes all input items on
 *   output 0 (`handleNodeExecutionError`). The error output stays empty.
 * - "Retry on fail" runs the whole node again when it throws, or when the first item that
 *   the node gives has an `error`.
 */
function emitCompiledContinue(
	c: NodeContext,
	call: StepCall,
	errorOutput: boolean,
	byPosition: boolean,
): void {
	const retry = errorRetry(c);
	const fields = retry ? call.fields.filter(([k]) => k !== 'retry') : call.fields;
	const opts = options(c, { ...call, fields }, `[${ITEM}]`);
	const helpers = emitContinueLoop(c.w, {
		node: c.node.name,
		out: c.output(0),
		errors: errorOutput ? c.output(1, 'Errors') : null,
		input: c.input,
		item: ITEM,
		index: call.usesIndex ? INDEX : null,
		call: (head) => c.print(opts, head),
		retry,
		byPosition,
		trace: c.traceAll === true,
	});
	for (const helper of helpers) c.helper(helper);
}

/** The names and the settings of the loop that `emitContinueLoop` writes. */
export interface ContinueLoop {
	/** The name of the n8n node. */
	node: string;
	/** The variable of output 0, and of the error output when the node has one. */
	out: string;
	errors: string | null;
	/** The variable of the input items, of one input item, and of its index when the call reads it. */
	input: string;
	item: string;
	index: string | null;
	/** The options of the `ctx.node` call for one item, printed after `head`. */
	call: (head: string) => string;
	/** "Retry on fail" of the node (`errorRetry`). */
	retry: { tries: number; delay: number } | null;
	/** True when the v1 node does not pair its error items with their input items. */
	byPosition: boolean;
	/** True when the code traces the error of a node that throws. */
	trace: boolean;
}

/**
 * Writes the loop of a compiled node under a "continue" setting, and returns the names of
 * the helpers that the loop calls. The converter and the check against v1
 * (`node-compile/__tests__/verify.ts`) write the same loop.
 */
export function emitContinueLoop(w: Writer, loop: ContinueLoop): string[] {
	const { out, errors, input, item, retry } = loop;
	const helpers: string[] = [];
	w.line(`let ${out}: Json[] = [];`);
	if (errors) w.line(`let ${errors}: Json[] = [];`);
	if (retry) {
		helpers.push('retryError');
		w.open(`for (let tryIndex = 0; tryIndex < ${retry.tries}; tryIndex++) {`);
		if (retry.delay > 0) {
			w.line(
				`if (tryIndex > 0) await ctx.wait({ name: ${str(`${loop.node} (retry)`)}, duration: ${retry.delay} });`,
			);
		}
		w.line(`${out} = [];`);
		if (errors) w.line(`${errors} = [];`);
		w.line('let again = false;');
		w.line('let count = 0;');
	}
	w.open('try {');
	if (errors) w.line('const all: Json[] = [];');
	if (errors && !loop.byPosition) w.line('const sources: Json[] = [];');
	if (loop.index !== null) {
		w.open(`for (let ${loop.index} = 0; ${loop.index} < ${input}.length; ${loop.index}++) {`);
		w.line(`const ${item} = ${input}[${loop.index}];`);
	} else {
		w.open(`for (const ${item} of ${input}) {`);
	}
	const head = 'const result: Json[] = await ctx.node(';
	w.block(`${head}${loop.call(head)});`);
	if (retry) {
		w.line('if (count === 0 && result.length > 0) again = retryError(result[0]);');
		w.line('count += result.length;');
	}
	if (errors) {
		w.open('for (const r of result) {');
		w.line('all.push(r);');
		if (!loop.byPosition) w.line(`sources.push(${item});`);
		w.close();
	} else {
		w.line(`for (const r of result) ${out}.push(r);`);
	}
	w.close();
	// v1 moves the error items after the node ran for all items.
	if (errors && loop.byPosition) {
		helpers.push('splitErrorItemsByPosition');
		w.line(`splitErrorItemsByPosition(all, ${input}, ${out}, ${errors});`);
	} else if (errors) {
		helpers.push('splitErrorItems');
		w.line(`splitErrorItems(all, sources, ${out}, ${errors});`);
	}
	w.close('} catch (error) {');
	w.depth++;
	if (retry) {
		w.line('again = true;');
		w.open(`if (tryIndex + 1 >= ${retry.tries}) {`);
	}
	w.line(`${out} = [...${input}];`);
	if (errors) w.line(`${errors} = [];`);
	if (loop.trace) {
		w.line(
			`ctx.trace(${str(loop.node)}, { $error: { message: error.message, description: error.description ?? '' } });`,
		);
	}
	if (retry) w.close();
	w.close();
	if (retry) {
		w.line('if (!again) break;');
		w.close();
	}
	return helpers;
}

/** The names and the settings of the code that `emitContinueOnce` writes. */
export interface ContinueOnce {
	/** The name of the n8n node. */
	node: string;
	/** The variable of output 0, and of the error output when the node has one. */
	out: string;
	errors: string | null;
	/** The variable of the input items. */
	input: string;
	/** The options of the `ctx.node` call for all items, printed after `head`. */
	call: (head: string) => string;
	/** "Retry on fail" of the node (`errorRetry`). */
	retry: { tries: number; delay: number } | null;
	/** True when the code traces the error of a node that throws. */
	trace: boolean;
	/** True when an error that the fallback host can run the node for leaves the code (`fileLimitInHost`). */
	hostLimit?: boolean;
}

/**
 * True when the module of a node that runs once under a "continue" setting gives the paired
 * item of each output item, the items with an `error` property, and if v1 runs the node
 * again (`{ items, paired, failed, again }`): with the error output, and with "retry on fail".
 */
export function pairedOutputOf(errorOutput: boolean, retry: object | null): boolean {
	return errorOutput || retry !== null;
}

/**
 * Writes one call of a compiled node under a "continue" setting, as v1 runs the node: once
 * with all items. Returns the names of the helpers that the code calls. The converter and
 * the check against v1 (`node-compile/__tests__/verify.ts`) write the same code.
 * - The module has the node's own handling of a failed item, so its result is the output
 *   of the v1 node. With the error output, the module gives the paired item of each item
 *   too, and `splitPairedErrorItems` moves the error items (`handleNodeErrorOutput`).
 * - When the node throws, v1 passes all input items on output 0 (`handleNodeExecutionError`).
 * - "Retry on fail" runs the node again when it throws, or when the first item that the
 *   node gives has an `error` in its json (`again`). v1 does not run a node without input items.
 */
export function emitContinueOnce(w: Writer, once: ContinueOnce): string[] {
	const { out, errors, input, retry } = once;
	const helpers: string[] = [];
	w.line(`let ${out}: Json[] = [];`);
	if (errors) w.line(`let ${errors}: Json[] = [];`);
	w.open(`if (${input}.length > 0) {`);
	if (retry) {
		w.open(`for (let tryIndex = 0; tryIndex < ${retry.tries}; tryIndex++) {`);
		if (retry.delay > 0) {
			w.line(
				`if (tryIndex > 0) await ctx.wait({ name: ${str(`${once.node} (retry)`)}, duration: ${retry.delay} });`,
			);
		}
	}
	w.open('try {');
	const paired = pairedOutputOf(errors !== null, retry);
	const head = `${paired ? 'const result: Json' : out} = await ctx.node(`;
	w.block(`${head}${once.call(head)});`);
	if (retry) w.line(`if (tryIndex + 1 < ${retry.tries} && result.again) continue;`);
	if (errors) {
		helpers.push('splitPairedErrorItems');
		w.line('const kept: Json[] = [];');
		w.line('const moved: Json[] = [];');
		w.line(`splitPairedErrorItems(result, ${input}, kept, moved);`);
		w.line(`${out} = kept;`);
		w.line(`${errors} = moved;`);
	} else if (paired) {
		w.line(`${out} = result.items;`);
	}
	if (retry) w.line('break;');
	w.close('} catch (error) {');
	w.depth++;
	if (once.hostLimit) {
		helpers.push('fileLimitInHost');
		w.line('if (fileLimitInHost(error)) throw error;');
	}
	if (retry) w.open(`if (tryIndex + 1 >= ${retry.tries}) {`);
	w.line(`${out} = [...${input}];`);
	if (errors) w.line(`${errors} = [];`);
	if (once.trace) {
		w.line(
			`ctx.trace(${str(once.node)}, { $error: { message: error.message, description: error.description ?? '' } });`,
		);
	}
	if (retry) w.close();
	w.close();
	if (retry) w.close();
	w.close();
	return helpers;
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
	// A node with no native form and no library node is compiled from its n8n source when
	// the caller gives the sources (`ConvertOptions.nodeSources`) and the source compiles.
	if (tryCompiledNode(c)) return;
	lowerHost(c);
}

/**
 * The parameters of a node for the fallback host. As v1: a parameter that takes no
 * expression (`noDataExpression`) is the text after its `=`. The converter does not evaluate
 * it, and the node in the host reads that text. A text that reads other nodes keeps its `=`:
 * the host has no run data here, so the converter translates it.
 */
export function hostOwnParameters(c: NodeContext): Record<string, unknown> {
	return stripNoDataExpressions(
		c.node.type,
		c.version,
		c.parameters,
		(text) => !/\$\(|\$node\b|\$items\b/.test(text),
	);
}

/** Writes the node as a call of the fallback host, with its v1 parameters. */
function lowerHost(c: NodeContext): void {
	const own = hostOwnParameters(c);
	for (const path of SELF_EVALUATED[c.node.type] ?? []) {
		let v: unknown = own;
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
		let v: unknown = own;
		for (const k of path) v = isRecord(v) ? v[k] : undefined;
		// The host has no run data here, so text that reads other nodes is translated instead.
		return typeof v === 'string' && !/\$\(|\$node\b|\$items\b/.test(v);
	});
	let input: unknown = own;
	if (rawPaths.length > 0) {
		input = structuredClone(own);
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
		let v: unknown = own;
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
