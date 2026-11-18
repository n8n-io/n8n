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
import { emitWithHostForm } from '../steps.ts';
import type { HostForm } from '../steps.ts';
import { checkTranslation } from './check.ts';
import type { AsyncForm } from './emit.ts';
import { emitAsync, emitExpression, emitHelpers } from './emit.ts';
import type { Blocker, CodeKind, CodeMode, TranslateResult } from './translate.ts';
import { HOST_GLOBALS, translateCode } from './translate.ts';
import { RUNS_IN_HOST } from '../helpers.ts';

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
				files?: string,
				made?: string,
			) => string;
			helpers: (plainInput?: boolean) => string[];
			/** `Translation.preparesBinary`: the code makes binary data. */
			preparesBinary?: boolean;
			/** `Translation.binaryNames`: the code reads the bytes of binary data of its input. */
			binaryNames?: string[] | 'all';
			/** `Translation.handsOver`: the code can end with the mark of `RUNS_IN_HOST`. */
			handsOver?: boolean;
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
		dateValues?: boolean;
		pairsByPosition?: (name: string) => boolean;
		defaultOutput?: (name: string) => number;
		notRun?: (name: string) => boolean;
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
	let options: Parameters<typeof translateCode>[0] = { ...src, hasNode, ...context };
	let r: TranslateResult = translateCode(options);
	// The form with typed Dates is exact or it does not compile; then the plain form applies.
	const typed = r.ok ? r.translation.typedDates : r.partial?.typedDates === true;
	if (typed && !(r.ok && checkTranslation(r.translation, src.mode).ok)) {
		options = { ...options, plainDates: true };
		r = translateCode(options);
	}
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
	// The node runs code that makes binary data two times (\`codePrepareBinary\`).
	if (t.preparesBinary && !t.repeatable) {
		return {
			ok: false,
			blockers: [
				{
					feature: 'this (this.helpers)',
					message:
						'`prepareBinaryData` has a native form only in code that can run two times: no random number and no static data.',
				},
			],
		};
	}
	// The traced form of the same code gives the line of an error (\`translate.ts\`).
	const second = translateCode({ ...options, traced: true });
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
		expression: (
			input,
			lists,
			allLists = [],
			plainInput = false,
			files = '{}',
			made = '{ plan: [] }',
		) => emitExpression(t, src.mode, input, lists, allLists, plainInput, traced, files, made),
		...(t.preparesBinary ? { preparesBinary: true } : {}),
		...(t.binaryNames !== undefined ? { binaryNames: t.binaryNames } : {}),
		...(t.handsOver ? { handsOver: true } : {}),
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
 * True when each node with a connection to this one has "execute once", false when none has,
 * and undefined when they differ or no node has a connection to this one. v1's `$items()`
 * reads the setting of the node that gave the input items of the run.
 */
export function previousRunsOnce(c: NodeContext): boolean | undefined {
	let once: boolean | undefined;
	for (const [from, outputs] of Object.entries(c.workflow.connections)) {
		for (const targets of outputs?.main ?? []) {
			for (const target of targets ?? []) {
				if (target.node !== c.node.name) continue;
				const node = c.workflow.nodes.find((n) => n.name === from);
				if (node === undefined) return undefined;
				const value = node.executeOnce === true;
				if (once !== undefined && once !== value) return undefined;
				once = value;
			}
		}
	}
	return once;
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
function retried(c: NodeContext, expr: string, onError: string, handsOver: boolean): void {
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
	// The mark of `RUNS_IN_HOST` is not an error of the code: the host form runs the node.
	if (handsOver) w.line('if (fileLimitInHost(error)) throw error;');
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

/** `BINARY_DATA_MAX_BYTES` of the `binaryData` service, and the base64 text of that many bytes. */
const STORED_MAX_BYTES = 262144;
const INLINE_MAX_BASE64 = 349528;
/** The largest number of stored files that a Code node reads before its code runs. */
const STORED_MAX_FILES = 32;

/**
 * The declaration of the async function `name` that reads the stored files of the input items
 * of a Code node before its code runs (`Translation.binaryNames`). The result has the base64
 * text of each stored file by its id, from the call `read` of the `binaryData` service. The
 * code itself makes no call: it stays synchronous, as its Buffer values need.
 *
 * The function ends with the mark of `RUNS_IN_HOST`, and the fallback host runs the node, for:
 * a file of more than 262,144 bytes (inline or stored), a stored file without a size, more
 * than 32 stored files, and each reason that the service names.
 */
export function storedFilesReader(name: string, step: string, names: string[] | 'all'): string {
	const mark = (reason: string) =>
		`throw new Error(${JSON.stringify(`${reason} ${RUNS_IN_HOST}`)});`;
	return [
		`const ${name} = async (items: Json[]): Promise<Json> => {`,
		'\tconst files: Json = {};',
		'\tlet count = 0;',
		'\tfor (const item of items) {',
		'\t\tconst binary: Json = item === null || item === undefined ? undefined : item.$binary;',
		"\t\tif (binary === null || binary === undefined || typeof binary !== 'object' || Array.isArray(binary)) continue;",
		`\t\tconst names: string[] = ${names === 'all' ? 'Object.keys(binary)' : JSON.stringify(names)};`,
		'\t\tfor (const name of names) {',
		'\t\t\tconst entry: Json = binary[name];',
		"\t\t\tif (entry === null || entry === undefined || typeof entry !== 'object') continue;",
		'\t\t\tconst id: Json = entry.id;',
		"\t\t\tif (id === undefined || id === null || id === '' || id === false || id === 0) {",
		`\t\t\t\tif (typeof entry.data === 'string' && entry.data.length > ${INLINE_MAX_BASE64}) ${mark('The code reads a file of more than 262144 bytes')}`,
		'\t\t\t\tcontinue;',
		'\t\t\t}',
		`\t\t\tif (typeof id !== 'string' || typeof entry.bytes !== 'number' || entry.bytes > ${STORED_MAX_BYTES}) ${mark('The code reads a stored file of more than 262144 bytes, or without a size')}`,
		"\t\t\tif (typeof files[id] === 'string') continue;",
		'\t\t\tcount += 1;',
		`\t\t\tif (count > ${STORED_MAX_FILES}) ${mark(`The code reads more than ${STORED_MAX_FILES} stored files`)}`,
		'\t\t\tlet answer: Json = null;',
		'\t\t\ttry {',
		`\t\t\t\tanswer = await ctx.service({ name: ${JSON.stringify(step)}, service: 'binaryData', op: 'read', args: { id, as: 'base64', limit: ${STORED_MAX_BYTES} } });`,
		'\t\t\t} catch (error) {',
		`\t\t\t\t${mark('The binaryData service gave no answer')}`,
		'\t\t\t}',
		`\t\t\tif (answer === null || answer === undefined || typeof answer !== 'object' || typeof answer.data !== 'string') ${mark('The binaryData service gave no bytes')}`,
		'\t\t\tfiles[id] = answer.data;',
		'\t\t}',
		'\t}',
		'\treturn files;',
		'};',
	].join('\n');
}

/**
 * The declaration of the async function `name` that stores the files of the plan of a Code
 * node that makes binary data (`codePrepareBinary`), with the call `store` of the
 * `binaryData` service: `prepareBinaryData` of n8n-core, in the binary data mode of the
 * instance. It ends with the mark of `RUNS_IN_HOST` for each reason that the service names.
 */
export function plannedFilesStore(name: string, step: string): string {
	const mark = (reason: string) =>
		`throw new Error(${JSON.stringify(`${reason} ${RUNS_IN_HOST}`)});`;
	return [
		`const ${name} = async (made: Json): Promise<Json[]> => {`,
		'\tconst entries: Json[] = [];',
		'\tfor (const planned of made.plan) {',
		`\t\tconst args: Json = { data: planned.data, limit: ${STORED_MAX_BYTES} };`,
		'\t\tif (planned.fileName !== undefined) args.fileName = planned.fileName;',
		'\t\tif (planned.mimeType !== undefined) args.mimeType = planned.mimeType;',
		'\t\tlet answer: Json = null;',
		'\t\ttry {',
		`\t\t\tanswer = await ctx.service({ name: ${JSON.stringify(step)}, service: 'binaryData', op: 'store', args });`,
		'\t\t} catch (error) {',
		`\t\t\t${mark('The binaryData service gave no answer')}`,
		'\t\t}',
		"\t\tconst entry: Json = answer === null || answer === undefined || typeof answer !== 'object' ? undefined : answer.entry;",
		`\t\tif (entry === null || entry === undefined || typeof entry !== 'object' || Array.isArray(entry)) ${mark('The binaryData service gave no binary data')}`,
		'\t\tentries.push(entry);',
		'\t}',
		'\treturn entries;',
		'};',
	].join('\n');
}

/**
 * Writes the node as native code and returns true, or returns false (with an
 * info diagnostic) when the host step must run it. `hostForm` gives the fallback-host form of
 * the node, for code that can end with the mark of `RUNS_IN_HOST`.
 */
export function lowerCodeNative(c: NodeContext, hostForm?: () => HostForm | null): boolean {
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
			dateValues: c.dateValues,
			// With "execute once" the node gets one input item, and the node before has more.
			pairsByPosition: (name) => c.node.executeOnce !== true && c.pairsByPosition(name),
			defaultOutput: (name) => c.readOutput(name),
			// As the host step: a node of the workflow without a list before this node has no run.
			// In the engine shape a later node of a loop can have a run.
			notRun: (name) =>
				!c.engine &&
				c.scope.nodeParameters(name) !== null &&
				(name === c.node.name || c.ranBefore(name) === null),
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
	const allLists = (attempt.allNodes ?? []).map((name) => c.ranBefore(name) ?? '[]');
	if (attempt.binaryNames !== undefined || attempt.preparesBinary === true) {
		// The code reads the bytes of binary data of its input: the stored files are read before
		// the code runs, and above a size limit the fallback host runs the node.
		// The code makes binary data: the first run of the code makes the plan of its files, the
		// node stores them, and the second run gives the code the stored entries. An error of the
		// first run can come from the values that it gives in place of the entries, so the
		// fallback host runs the node then.
		// A step name is unique: the service calls are helper steps with the name
		// `<node> (<role>)`, so no node of the workflow can have that name.
		const steps = { read: `${c.node.name} (read files)`, store: `${c.node.name} (store files)` };
		const host =
			onError === 'stopWorkflow' &&
			c.node.retryOnFail !== true &&
			c.services !== false &&
			c.scope.binaryMode !== 'combined' &&
			!c.workflow.nodes.some((n) => n.name === steps.read || n.name === steps.store)
				? (hostForm?.() ?? null)
				: null;
		if (host === null) {
			c.info(
				'code-host',
				'The code runs in the fallback host: it reads the bytes of binary data or makes binary data, which has a native form only with service calls, with the binary mode `separate`, without an error setting that continues and without "retry on fail".',
				field,
			);
			return false;
		}
		const read = c.local('ReadFiles');
		const store = c.local('StoreFiles');
		const files = attempt.binaryNames !== undefined ? c.local('Files') : '{}';
		const made = c.local('Made');
		const mark = (reason: string) =>
			`throw new Error(${JSON.stringify(`${reason} ${RUNS_IN_HOST}`)});`;
		if (attempt.binaryNames !== undefined) {
			w.block(storedFilesReader(read, steps.read, attempt.binaryNames));
		}
		if (attempt.preparesBinary === true) w.block(plannedFilesStore(store, steps.store));
		const run = () => attempt.expression(input, lists, allLists, plainInput, files, made);
		emitWithHostForm(
			c,
			false,
			(to) => {
				const out = to.output(0);
				if (attempt.binaryNames !== undefined) {
					to.w.line(`const ${files}: Json = await ${read}(${input});`);
				}
				if (attempt.preparesBinary !== true) {
					to.w.block(`const ${out}: Json[] = ${input}.length > 0 ? ${run()} : [];`);
					return;
				}
				to.w.line(`const ${made}: Json = { plan: [] };`);
				to.w.line(`let ${out}: Json[] = [];`);
				to.w.open(`if (${input}.length > 0) {`);
				to.w.open('try {');
				to.w.block(`${out} = ${run()};`);
				to.w.close('} catch (error) {');
				to.w.depth++;
				to.w.line(mark('The first run of code that makes binary data failed'));
				to.w.close();
				to.w.line(
					`if (${made}.host === true) ${mark('The code makes binary data outside the limits')}`,
				);
				to.w.open(`if (${made}.plan.length > 0) {`);
				to.w.line(`${made}.entries = await ${store}(${made});`);
				to.w.line(`${made}.next = 0;`);
				to.w.block(`${out} = ${run()};`);
				to.w.line(
					`if (${made}.host === true || ${made}.next !== ${made}.plan.length) ${mark('The second run of code that makes binary data differs from its first run')}`,
				);
				to.w.close();
				to.w.close();
			},
			host,
		);
		return true;
	}
	// The form of the node without a hand-over, written to `to`.
	const emitPlain = (to: NodeContext, handsOver: boolean): void => {
		const { w } = to;
		const out = to.output(0);
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
			retried(to, expr, onError, handsOver);
			return;
		}
		if (onError === 'stopWorkflow') {
			// The result list comes from a JSON parse (`codeItems`), and no other code assigns it.
			c.plainLists?.add(out);
			w.block(`const ${out}: Json[] = ${input}.length > 0 ? ${expr} : [];`);
			return;
		}
		// As v1's Code node in "all items" mode: one item with the error message.
		const errors = onError === 'continueErrorOutput' ? to.output(1, 'Errors') : null;
		if (errors) w.line(`const ${errors}: Json[] = [];`);
		w.line(`let ${out}: Json[] = [];`);
		w.open(`if (${input}.length > 0) {`);
		w.open('try {');
		w.block(`${out} = ${expr};`);
		w.close('} catch (error) {');
		w.depth++;
		// A result that is not valid fails the node under each error setting, as in v1. The mark
		// of `RUNS_IN_HOST` is not an error of the code: the host form runs the node.
		w.line(
			handsOver
				? 'if (error.$invalid || fileLimitInHost(error)) throw error;'
				: 'if (error.$invalid) throw error;',
		);
		// As v1: the error output gets the first input item with the message.
		if (errors) w.line(`${errors}.push({ ...${input}[0], error: error.message });`);
		else w.line(`${out} = [{ error: error.message }];`);
		w.close();
		w.close();
	};
	if (attempt.handsOver === true) {
		// The code has a form that stops on a rare input (`Translation.handsOver`): then the
		// fallback host runs the node in the same run. The code has no effect before that point.
		const host = hostForm?.() ?? null;
		if (host === null) {
			c.info(
				'code-host',
				'The code runs in the fallback host: it has a form that can hand the node over to the fallback host at run time, and the node has no host form here.',
				field,
			);
			return false;
		}
		emitWithHostForm(c, onError === 'continueErrorOutput', (to) => emitPlain(to, true), host);
		return true;
	}
	emitPlain(c, false);
	return true;
}
