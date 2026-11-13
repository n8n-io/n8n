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
import { emitExpression, emitHelpers } from './emit.ts';
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

export type NativeAttempt =
	| {
			ok: true;
			expression: (input: string, lists: string[], allLists?: string[]) => string;
			helpers: string[];
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
	} = {},
): NativeAttempt & { nodes?: string[]; zones?: string[]; allNodes?: string[] } {
	const src = codeOf(type, parameters);
	if (!src) return { ok: false, blockers: [{ feature: 'language', message: 'Not JavaScript.' }] };
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
	// The converter skips this: it compiles the whole workflow and moves a node
	// whose native form does not compile to the host (`../index.ts`).
	if (context.check !== false) {
		const checked = checkTranslation(r.translation, src.mode);
		if (!checked.ok) return checked;
	}
	const t = r.translation;
	return {
		ok: true,
		nodes: t.nodes,
		zones: [...t.zones],
		allNodes: t.allNodes,
		expression: (input, lists, allLists = []) =>
			emitExpression(t, src.mode, input, lists, allLists),
		helpers: emitHelpers(t),
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
	for (const h of attempt.helpers) c.helper(h);
	for (const z of attempt.zones ?? []) c.useZone?.(z);
	const { w, input } = c;
	const out = c.output(0);
	const allLists = (attempt.allNodes ?? []).map((name) => c.ranBefore(name) ?? '[]');
	const expr = attempt.expression(input, lists, allLists);
	if (onError === 'stopWorkflow') {
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
	if (errors) w.line(`${errors}.push({ error: error.message });`);
	else w.line(`${out} = [{ error: error.message }];`);
	w.close();
	w.close();
	return true;
}
