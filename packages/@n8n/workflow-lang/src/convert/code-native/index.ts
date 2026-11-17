/**
 * Native Code node steps: JavaScript Code, Function and Function Item nodes
 * whose code fits the subset become plain code in the workflow, and not a
 * `ctx.code` step in the fallback host.
 *
 * `lowerCodeNative` translates the code (`translate.ts`), compiles it on its
 * own (`check.ts`) and writes it. When a construct does not fit, it returns
 * false and reports an `info` diagnostic `code-host` that names the blocking
 * construct. The caller then writes the host step.
 *
 * The host step stays available: `ConvertOptions.codeNodes: 'host'` keeps it
 * for every Code node, `ConvertOptions.hostCodeNodes` for the named nodes,
 * and a `// @n8n-host` comment in the code for that node.
 */
import { NodeFailure } from '../context.ts';
import type { NodeContext } from '../context.ts';
import { checkTranslation } from './check.ts';
import type { AsyncForm } from './emit.ts';
import { emitAsync, emitExpression, emitHelpers } from './emit.ts';
import type { Blocker, CodeKind, CodeMode, TranslateResult } from './translate.ts';
import { HOST_GLOBALS, translateCode } from './translate.ts';

/** Compiler names of blockers that the translation names otherwise. */
const COMPILER_FEATURES: Record<string, string> = {
	...HOST_GLOBALS,
	this: 'this (this.helpers)',
	'WL020 Regular expressions are not allowed.': 'regular expression',
};

export type { Blocker } from './translate.ts';

/** The JavaScript, mode and kind of a Code, Function or Function Item node, or null. */
export function codeOf(
	type: string,
	parameters: Record<string, unknown>,
): { code: string; mode: CodeMode; kind: CodeKind } | null {
	if (type === 'n8n-nodes-base.code') {
		if ((parameters.language ?? 'javaScript') !== 'javaScript') return null;
		return {
			code: typeof parameters.jsCode === 'string' ? parameters.jsCode : '',
			mode: parameters.mode === 'runOnceForEachItem' ? 'each' : 'all',
			kind: 'code',
		};
	}
	if (type === 'n8n-nodes-base.function') {
		const code = parameters.functionCode;
		return { code: typeof code === 'string' ? code : '', mode: 'all', kind: 'function' };
	}
	if (type === 'n8n-nodes-base.functionItem') {
		const code = parameters.functionCode;
		return { code: typeof code === 'string' ? code : '', mode: 'each', kind: 'functionItem' };
	}
	return null;
}

/**
 * The error of v1's Code node for code of "each item" mode that names a method of \`$input\`
 * for all items (\`validateNoDisallowedMethodsInRunForEach\` of the Code node): the node
 * fails before the code runs. Null when the code has none.
 */
export function eachItemModeError(user: string): string | null {
	const method = /\$input\.(first|last|all|itemMatching)/.exec(user)?.[1];
	if (method === undefined) return null;
	const line =
		user.split('\n').findIndex((text) => {
			const start = text.trimStart();
			return (
				start.includes(method) &&
				!start.startsWith('//') &&
				!start.startsWith('/*') &&
				!start.startsWith('*')
			);
		}) + 1;
	return line === 0 ? null : `Can't use .${method}() here [line ${line}, for item 0]`;
}

export type NativeAttempt =
	| {
			ok: true;
			/** `plainInput`: the input list is plain JSON from a parse (see `emit.ts`). */
			expression: (
				input: string,
				lists: string[],
				allLists?: string[],
				plainInput?: boolean,
			) => string;
			helpers: (plainInput?: boolean) => string[];
			/**
			 * For code that makes requests: the declaration of its async function and the
			 * expression of the result list. Undefined for other code.
			 */
			async?: (
				form: AsyncForm,
				input: string,
				lists: string[],
				allLists?: string[],
				plainInput?: boolean,
			) => { declaration: string; expression: string };
	  }
	| { ok: false; blockers: Blocker[] };

/** Translates and compiles the code of a node. `hasNode` tells which nodes ran before it. */
export function attemptNative(
	type: string,
	parameters: Record<string, unknown>,
	hasNode: (name: string) => boolean,
	collectAll = false,
	context: {
		workflow?: { name: string; id: string };
		runIndex?: string;
		check?: boolean;
		allNodes?: string[];
		timezone?: string;
		nodeName?: string;
		itemsOfFirstOnly?: boolean;
		allowedModules?: string[];
	} = {},
): NativeAttempt & { nodes?: string[]; zones?: string[]; allNodes?: string[] } {
	const src = codeOf(type, parameters);
	if (!src) return { ok: false, blockers: [{ feature: 'language', message: 'Not JavaScript.' }] };
	// v1 fails such a node before its code runs; the host step gives that error.
	if (src.kind === 'code' && src.mode === 'each' && eachItemModeError(src.code) !== null) {
		return {
			ok: false,
			blockers: [
				{
					feature: '$input.all() in each item mode',
					message: 'The code names a method of `$input` that v1 refuses in "each item" mode.',
				},
			],
		};
	}
	const r: TranslateResult = translateCode({ ...src, hasNode, ...context });
	if (!r.ok) {
		if (!collectAll || !r.partial) return r;
		// Analysis: the compiler finds the blockers that the translation does not know.
		const more = checkTranslation(r.partial, src.mode);
		const blockers = [...r.blockers];
		if (!more.ok) {
			for (const b of more.blockers) {
				const feature = Object.hasOwn(COMPILER_FEATURES, b.feature)
					? COMPILER_FEATURES[b.feature]
					: b.feature;
				if (!blockers.some((x) => x.feature === feature)) blockers.push({ ...b, feature });
			}
		}
		return { ok: false, blockers };
	}
	const t = r.translation;
	// The traced form of the same code gives the line of an error (\`translate.ts\`).
	const second = translateCode({ ...src, hasNode, ...context, traced: true });
	if (!second.ok) {
		return {
			ok: false,
			blockers: [
				{
					feature: 'line of an error',
					message: `The traced form of the code has no native form: ${second.blockers.map((b) => b.feature).join(', ')}.`,
				},
			],
		};
	}
	const traced = second.translation;
	// The converter skips this: it compiles the whole workflow and moves a node
	// whose native form does not compile to the host (`../index.ts`).
	if (context.check !== false) {
		const checked = checkTranslation(t, src.mode, false, traced);
		if (!checked.ok) return checked;
	}
	return {
		ok: true,
		nodes: t.nodes,
		zones: [...t.zones],
		allNodes: t.allNodes,
		expression: (input, lists, allLists = [], plainInput = false) =>
			emitExpression(t, src.mode, input, lists, allLists, plainInput, traced),
		helpers: (plainInput = false) => emitHelpers(t, src.mode, plainInput, traced),
		...(t.usesHttp
			? {
					async: (form, input, lists, allLists = [], plainInput = false) =>
						emitAsync(t, src.mode, form, input, lists, allLists, plainInput, traced),
				}
			: {}),
	};
}

function blockerText(blockers: Blocker[]): string {
	return blockers
		.slice(0, 3)
		.map((b) => b.feature)
		.join(', ');
}

/** True when the text has a character U+0001-U+0003. */
function hasMarkerCharacter(text: string): boolean {
	for (let k = 0; k < text.length; k++) {
		const c = text.charCodeAt(k);
		if (c >= 1 && c <= 3) return true;
	}
	return false;
}

/** The text with each character U+0001-U+0003 as a `\u000N` escape. */
function escapeMarkerCharacters(text: string): string {
	let out = '';
	for (let k = 0; k < text.length; k++) {
		const c = text.charCodeAt(k);
		out += c >= 1 && c <= 3 ? `\\u000${c}` : text.charAt(k);
	}
	return out;
}

/**
 * True when the node before this one has "execute once", false when it has not, and undefined
 * when the node before this one is not fixed. v1's `$items()` reads the setting of that node.
 */
export function previousRunsOnce(c: NodeContext): boolean | undefined {
	const name = c.scope.prevNode;
	if (c.scope.prevSource !== undefined || name === null) return undefined;
	const node = c.workflow.nodes.find((n) => n.name === name);
	return node === undefined ? undefined : node.executeOnce === true;
}

/**
 * Writes a native Code node with "retry on fail", as v1's engine runs it
 * (`WorkflowExecute`): up to `min(5, max(2, maxTries || 3))` tries, with
 * `waitBetweenTries` (0 to 5000 ms, default 1000) before each next try. The engine tries
 * again when the node throws, and when the first item of its result has an `error` that is
 * not undefined, null or false: under an error setting that continues, the Code node gives
 * such an item for an error of its code. After the last try, the node fails or gives its
 * result as without the setting.
 */
function retried(c: NodeContext, expr: string, onError: string): void {
	const { w, input } = c;
	const out = c.output(0);
	const tries = Math.min(5, Math.max(2, c.node.maxTries || 3));
	const delay = Math.min(5000, Math.max(0, c.node.waitBetweenTries || 1000));
	const errors = onError === 'continueErrorOutput' ? c.output(1, 'Errors') : null;
	c.helper('retryError');
	if (errors) w.line(`const ${errors}: Json[] = [];`);
	w.line(`let ${out}: Json[] = [];`);
	w.open(`if (${input}.length > 0) {`);
	// The item of the error output of the last try, or null.
	if (errors) w.line('let failedItem: Json = null;');
	w.open(`for (let tryIndex = 0; tryIndex < ${tries}; tryIndex++) {`);
	if (delay > 0) {
		w.line(
			`if (tryIndex > 0) await ctx.wait({ name: ${JSON.stringify(`${c.node.name} (retry)`)}, duration: ${delay} });`,
		);
	}
	w.line('let thrown = false;');
	if (errors) w.line('failedItem = null;');
	w.open('try {');
	w.block(`${out} = ${expr};`);
	w.close('} catch (error) {');
	w.depth++;
	// The engine tries again after each error; the last one fails the node, as does a result
	// that is not valid under each error setting.
	w.line(
		onError === 'stopWorkflow'
			? `if (tryIndex + 1 >= ${tries}) throw error;`
			: `if (error.$invalid && tryIndex + 1 >= ${tries}) throw error;`,
	);
	w.line('thrown = true;');
	if (onError !== 'stopWorkflow') {
		w.open('if (!error.$invalid) {');
		// The Code node gives the error as an item, and the engine sees a failed first item.
		if (errors) {
			w.line(`${out} = [];`);
			w.line(`failedItem = { ...${input}[0], error: error.message };`);
		} else w.line(`${out} = [{ error: error.message }];`);
		w.close();
	}
	w.close();
	w.line(`if (!thrown && !retryError(${out}[0])) break;`);
	w.close();
	if (errors) w.line(`if (failedItem !== null) ${errors}.push(failedItem);`);
	w.close();
}

/**
 * Writes the node as native code and returns true, or returns false (with an
 * info diagnostic) when the host step must run it.
 */
export function lowerCodeNative(c: NodeContext): boolean {
	const field = c.node.type === 'n8n-nodes-base.code' ? 'jsCode' : 'functionCode';
	if (c.codeNodes === 'host') return false;
	// The characters U+0001-U+0003 mark translated expressions in the generated source, so
	// user code gives them as escapes, which mean the same inside strings, templates and regexes.
	const code = c.parameters[field];
	const parameters =
		typeof code === 'string' && hasMarkerCharacter(code)
			? { ...c.parameters, [field]: escapeMarkerCharacters(code) }
			: c.parameters;
	const attempt = attemptNative(
		c.node.type,
		parameters,
		// The node's own earlier run (in a loop) is the variable that its output shadows.
		(name) => name !== c.node.name && c.ranBefore(name) !== null,
		false,
		{
			workflow: { name: c.scope.workflowName, id: c.scope.workflowId },
			runIndex: c.runIndex,
			timezone: c.scope.timezone,
			nodeName: c.node.name,
			itemsOfFirstOnly: previousRunsOnce(c),
			allowedModules: c.codeModules,
			check: false,
			allNodes: c.workflow.nodes
				.map((n) => n.name)
				.filter((name) => name !== c.node.name && c.ranBefore(name) !== null),
		},
	);
	if (!attempt.ok) {
		c.info(
			'code-host',
			`The code runs in the fallback host: ${blockerText(attempt.blockers)}.`,
			field,
		);
		return false;
	}
	const onError =
		c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
	// v1 catches the error of each item separately in "each" mode; native code runs all items at once.
	if (onError !== 'stopWorkflow' && codeOf(c.node.type, c.parameters)?.mode === 'each') {
		c.info(
			'code-host',
			'The code runs in the fallback host: "each item" mode with an error setting that continues.',
			field,
		);
		return false;
	}
	const lists = (attempt.nodes ?? []).map((name) => {
		const list = c.ranBefore(name);
		if (list === null) throw new NodeFailure('code-native', `Node "${name}" has no list.`);
		return list;
	});
	const { w, input } = c;
	const plainInput = c.plainLists?.has(input) ?? false;
	for (const h of attempt.helpers(plainInput)) c.helper(h);
	for (const z of attempt.zones ?? []) c.useZone?.(z);
	const out = c.output(0);
	const allLists = (attempt.allNodes ?? []).map((name) => c.ranBefore(name) ?? '[]');
	let expr: string;
	if (attempt.async) {
		// The workflow awaits only a call of a local async function, so the code gets a name.
		const form = { fn: c.local('Run'), step: c.node.name };
		const parts = attempt.async(form, input, lists, allLists, plainInput);
		w.block(parts.declaration);
		expr = parts.expression;
	} else {
		expr = attempt.expression(input, lists, allLists, plainInput);
	}
	if (c.node.retryOnFail === true) {
		retried(c, expr, onError);
		return true;
	}
	if (onError === 'stopWorkflow') {
		// The result list comes from a JSON parse (`codeItems`), and no other code assigns it.
		c.plainLists?.add(out);
		w.block(`const ${out}: Json[] = ${input}.length > 0 ? ${expr} : [];`);
		return true;
	}
	// As v1's Code node in "all items" mode: one item with the error message.
	const errors = onError === 'continueErrorOutput' ? c.output(1, 'Errors') : null;
	if (errors) w.line(`const ${errors}: Json[] = [];`);
	w.line(`let ${out}: Json[] = [];`);
	w.open(`if (${input}.length > 0) {`);
	w.open('try {');
	w.block(`${out} = ${expr};`);
	w.close('} catch (error) {');
	w.depth++;
	// A result that is not valid fails the node under each error setting, as in v1.
	w.line('if (error.$invalid) throw error;');
	// As v1: the error output gets the first input item with the message.
	if (errors) w.line(`${errors}.push({ ...${input}[0], error: error.message });`);
	else w.line(`${out} = [{ error: error.message }];`);
	w.close();
	w.close();
	return true;
}
