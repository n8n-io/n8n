import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Context } from 'node:vm';
import { Script, createContext } from 'node:vm';

import { readItems, StepInputError, toResultItems } from './items';
import { jmespathText } from './jmespath';
import { isJsonObject, type JsonObject } from './protocol';

export const DEFAULT_CODE_TIMEOUT_MS = 5_000;

export interface CodeStepArgs {
	name: string;
	code: string;
	items: JsonObject[];
	/** `python` runs the code in `python3` (`python-step.ts`). */
	language?: 'javaScript' | 'python';
	/** The time zone of the workflow, Luxon's default zone in the code (`$now`, `DateTime`). */
	timezone?: string;
	/**
	 * The workflow static data of the execution (spec 9.7). Without it,
	 * `$getWorkflowStaticData` starts empty and changes are not kept, as in a
	 * manual run of n8n.
	 */
	staticData?: JsonObject;
}

export interface CodeStepOptions {
	/** The longest time that the code can run, in milliseconds. */
	timeoutMs?: number;
	/** Gets the static data document after the code read or changed it. */
	onStaticData?: (doc: JsonObject) => void;
}

export class CodeStepError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CodeStepError';
	}
}

export function parseCodeStepArgs(args: JsonObject): CodeStepArgs {
	const { name, code, items, language, timezone } = args;
	if (typeof code !== 'string') throw new StepInputError('"code" must be a string');
	if (
		language !== undefined &&
		language !== null &&
		language !== 'javaScript' &&
		language !== 'python'
	) {
		throw new StepInputError('"language" must be "javaScript" or "python"');
	}
	return {
		name: typeof name === 'string' ? name : '',
		code,
		items: readItems(items),
		language: language === 'python' ? 'python' : 'javaScript',
		...(typeof timezone === 'string' && timezone !== '' ? { timezone } : {}),
	};
}

/**
 * The script that runs in the context. It parses the items in the context, so
 * no object of the host realm reaches the code. The code runs as the body of
 * an async function, with `this` as in n8n's Code node (`this.helpers`). The
 * script records the outcome as text in `out`.
 */
function wrap(code: string): string {
	// Sloppy mode, as in n8n's task runner: code can assign a name that it does not declare.
	return [
		'const __wfOut = { done: false, json: undefined, error: undefined };',
		'(async function (items) {',
		code,
		'\n}).call(__wfThis, JSON.parse(__wfItems)).then(',
		'  (value) => {',
		'    try { __wfOut.json = JSON.stringify(value === undefined ? null : value); }',
		'    catch (error) { __wfOut.error = "Code returned a value that is not JSON: " + String(error && error.message); }',
		'    if (globalThis.__wfStaticDoc !== undefined) {',
		'      try { __wfOut.staticJson = JSON.stringify(globalThis.__wfStaticDoc); }',
		'      catch (error) { __wfOut.error = "The static data is not JSON: " + String(error && error.message); }',
		'    }',
		'    __wfOut.done = true;',
		'  },',
		'  (error) => {',
		'    __wfOut.error = error !== null && typeof error === "object" && "message" in error',
		'      ? String(error.message) : String(error);',
		'    __wfOut.done = true;',
		'  },',
		');',
		'__wfOut;',
	].join('\n');
}

// ---------------------------------------------------------------------------
// Globals of n8n's Code node that code steps get

const hostRequire = createRequire(__filename);

/** Luxon, as n8n's Code node gives it: `DateTime`, `Duration`, `Interval`, `$now`, `$today`. */
const USES_LUXON = /\b(DateTime|Duration|Interval)\b|\$now\b|\$today\b/;

/** `Buffer` and `this.helpers` need the host's `Buffer` in the context. */
const USES_BUFFER = /\bBuffer\b|\bhelpers\b/;

const USES_REQUIRE = /\brequire\s*\(/;

const USES_JMESPATH = /\$jmespath\b/;

let luxonScript: Script | undefined;

/**
 * Luxon runs inside the context, so its objects belong to the context. The
 * script loads the Luxon build of n8n-workflow once and runs it in each
 * context that needs it.
 */
function luxon(): Script {
	if (luxonScript) return luxonScript;
	const workflowRequire = createRequire(hostRequire.resolve('n8n-workflow'));
	const source = readFileSync(workflowRequire.resolve('luxon'), 'utf8');
	luxonScript = new Script(
		[
			'(function () {',
			'const module = { exports: {} };',
			'(function (module, exports) {',
			source,
			'\n})(module, module.exports);',
			'const { DateTime, Duration, Interval, Settings } = module.exports;',
			// The zone of the workflow, as v1 sets it; each step has its own context and Luxon.
			"if (typeof __wfZone === 'string') Settings.defaultZone = __wfZone;",
			'globalThis.DateTime = DateTime;',
			'globalThis.Duration = Duration;',
			'globalThis.Interval = Interval;',
			'globalThis.$now = DateTime.now();',
			'globalThis.$today = DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });',
			'})();',
		].join('\n'),
		{ filename: 'luxon.js' },
	);
	return luxonScript;
}

/**
 * `this.helpers` of n8n's Code node, for the helpers that need no n8n
 * instance. Binary data has the in-memory form of `binary.ts`.
 */
const HELPERS = new Script(
	`globalThis.__wfThis = {
	helpers: {
		prepareBinaryData(data, fileName, mimeType) {
			const buffer = typeof data === 'string' ? Buffer.from(data) : data;
			const type = mimeType || (fileName && __wfMime.lookup(fileName)) || 'text/plain';
			const extension = fileName && fileName.includes('.') ? fileName.split('.').pop() : __wfMime.extension(type);
			const out = { mimeType: type };
			const fileType = __wfMime.fileType(type);
			if (fileType) out.fileType = fileType;
			if (extension) out.fileExtension = extension;
			if (fileName) out.fileName = fileName;
			out.data = buffer.toString('base64');
			out.fileSize = __wfMime.size(buffer.length);
			out.bytes = buffer.length;
			return out;
		},
		getBinaryDataBuffer(itemIndex, propertyName) {
			const list = JSON.parse(__wfItems);
			const entry = (list[itemIndex] || {}).$binary || {};
			const binary = entry[propertyName];
			if (!binary) throw new Error('This item has no binary property "' + propertyName + '"');
			return Buffer.from(binary.data, 'base64');
		},
		binaryToString(buffer, encoding) {
			return buffer.toString(encoding || 'utf8');
		},
		// n8n's \`httpRequest\` helper (no credential). Options and result cross the realm as JSON.
		async httpRequest(options) {
			if (typeof __wfHttpRequest !== 'function') throw new Error('httpRequest is not available here');
			return JSON.parse(await __wfHttpRequest(JSON.stringify(options || {})));
		},
	},
};
// $jmespath of n8n (jmespath.ts). Data and result cross the context as JSON.
if (typeof __wfJmespath === 'function') {
	globalThis.$jmespath = (data, query) => JSON.parse(__wfJmespath(JSON.stringify(data), query));
}
// The variables of the instance (\`WF_FALLBACK_VARIABLES\`), as \`$vars\` of n8n.
globalThis.$vars = Object.freeze(JSON.parse(__wfVars));
// $env as n8n gives it: by default (N8N_BLOCK_ENV_ACCESS_IN_NODE not "false") a read throws.
globalThis.$env = __wfEnv === null
	? new Proxy({}, { get(_, name) {
		if (typeof name !== 'string') return undefined;
		throw new Error('access to env vars denied');
	} })
	: Object.freeze(JSON.parse(__wfEnv));
// Static data as n8n keeps it in \`workflow.staticData\`: \`global\` and \`node:<name>\`.
// The document comes in as JSON (\`__wfStatic\`); without it, it starts empty and is
// not saved, as in a manual run of n8n. The wrapper sends it back when the code read it.
globalThis.$getWorkflowStaticData = (type) => {
	if (type !== 'global' && type !== 'node') {
		throw new Error('The type needs to either be "global" or "node"!');
	}
	if (globalThis.__wfStaticDoc === undefined) {
		globalThis.__wfStaticDoc = typeof __wfStatic === 'string' ? JSON.parse(__wfStatic) : {};
	}
	const doc = globalThis.__wfStaticDoc;
	const key = type === 'global' ? 'global' : 'node:' + __wfNodeName;
	if (doc[key] === null || typeof doc[key] !== 'object' || Array.isArray(doc[key])) doc[key] = {};
	return doc[key];
};`,
	{ filename: 'helpers.js' },
);

/** `WF_FALLBACK_VARIABLES` as JSON object text, `{}` when it is not set or not an object. */
function variablesText(): string {
	try {
		const parsed: unknown = JSON.parse(process.env.WF_FALLBACK_VARIABLES ?? '{}');
		return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
			? JSON.stringify(parsed)
			: '{}';
	} catch {
		return '{}';
	}
}

interface MimeTypes {
	lookup(path: string): string | false;
	extension(type: string): string | false;
}

function isMimeTypes(value: unknown): value is MimeTypes {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof Reflect.get(value, 'lookup') === 'function' &&
		typeof Reflect.get(value, 'extension') === 'function'
	);
}

let mimeTypes: MimeTypes | undefined;

function mime(): MimeTypes {
	if (mimeTypes) return mimeTypes;
	const loaded: unknown = createRequire(hostRequire.resolve('n8n-core'))('mime-types');
	if (!isMimeTypes(loaded)) throw new CodeStepError('mime-types did not load');
	mimeTypes = loaded;
	return loaded;
}

/** `fileTypeFromMimeType` of n8n-workflow. */
function fileType(type: string): string | undefined {
	if (type.startsWith('application/json')) return 'json';
	if (type.startsWith('text/html')) return 'html';
	if (type.startsWith('image/')) return 'image';
	if (type.startsWith('audio/')) return 'audio';
	if (type.startsWith('video/')) return 'video';
	if (type.startsWith('text/') || type.startsWith('application/javascript')) return 'text';
	if (type.startsWith('application/pdf')) return 'pdf';
	return undefined;
}

/** `pretty-bytes` as n8n uses it for `fileSize`. */
function size(bytes: number): string {
	const units = ['B', 'kB', 'MB', 'GB', 'TB'];
	if (bytes < 1000) return `${bytes} B`;
	const exponent = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
	const value = Number((bytes / 1000 ** exponent).toPrecision(3));
	return `${value} ${units[exponent]}`;
}

/**
 * `require` of the Code node. n8n allows only the modules of
 * `NODE_FUNCTION_ALLOW_BUILTIN` and `NODE_FUNCTION_ALLOW_EXTERNAL`; the host
 * reads one list, `WF_FALLBACK_CODE_ALLOW_MODULES` (comma-separated, `*` for
 * all). Allowed modules load from the n8n node package.
 */
function codeRequire(): (name: string) => unknown {
	const allowed = (process.env.WF_FALLBACK_CODE_ALLOW_MODULES ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s !== '');
	const load = createRequire(hostRequire.resolve('n8n-nodes-base/package.json'));
	return (name: string) => {
		if (!allowed.includes('*') && !allowed.includes(name)) {
			throw new CodeStepError(`Module '${name}' is disallowed`);
		}
		return load(name);
	};
}

interface ScriptOutcome {
	done: unknown;
	json: unknown;
	error: unknown;
	staticJson?: unknown;
}

function isScriptOutcome(value: unknown): value is ScriptOutcome {
	return typeof value === 'object' && value !== null && 'done' in value;
}

/**
 * Runs the code of a `ctx.code` step like the Code node in "Run Once for All
 * Items" mode. Each call gets a fresh context with `items` and no `require`,
 * timers or I/O.
 *
 * The context drains its own microtask queue before `runInContext` returns
 * (`microtaskMode: 'afterEvaluate'`), so the timeout also covers the code
 * after each `await`. The context has no timers, so code that has not
 * finished at that point cannot finish later.
 *
 * `node:vm` is not a security boundary. It isolates globals, not the process.
 */
/** The most compiled scripts that the host keeps. */
const SCRIPT_CACHE_SIZE = 256;

/**
 * Compiled scripts by file name and code. A `Script` does not belong to a
 * context, and each step runs it in a new context, so a script can run again.
 * A workflow runs the same code many times, and a compile cost more than a
 * small code step.
 */
const scripts = new Map<string, Script>();

function compiled(args: CodeStepArgs): Script {
	const filename = `${args.name || 'code'}.js`;
	const key = `${filename}\0${args.code}`;
	const cached = scripts.get(key);
	if (cached) {
		// Move the entry to the end, so the oldest entry goes first.
		scripts.delete(key);
		scripts.set(key, cached);
		return cached;
	}
	let script: Script;
	try {
		script = new Script(wrap(args.code), { filename });
	} catch (error) {
		throw new CodeStepError(`Code has a syntax error: ${messageOf(error)}`);
	}
	scripts.set(key, script);
	if (scripts.size > SCRIPT_CACHE_SIZE) {
		const oldest = scripts.keys().next();
		if (!oldest.done) scripts.delete(oldest.value);
	}
	return script;
}

/** The globals of a step that are text from the host (JSON) or null. */
function stepGlobals(args: CodeStepArgs): Record<string, string | null> {
	return {
		__wfItems: JSON.stringify(args.items),
		__wfVars: variablesText(),
		__wfZone: args.timezone ?? null,
		__wfStatic: args.staticData === undefined ? null : JSON.stringify(args.staticData),
		__wfNodeName: args.name,
		// The environment only when the code reads it and access is not blocked.
		__wfEnv:
			process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE === 'false' && args.code.includes('$env')
				? JSON.stringify(process.env)
				: null,
	};
}

/** The script and context of a code step. With `timers`, the context has n8n's timers. */
function prepare(args: CodeStepArgs, timers: boolean): { script: Script; context: Context } {
	const script = compiled(args);

	const globals: Record<string, unknown> = stepGlobals(args);
	if (USES_BUFFER.test(args.code)) {
		const types = mime();
		globals.Buffer = Buffer;
		globals.__wfMime = {
			lookup: (path: string) => types.lookup(path) || undefined,
			extension: (type: string) => types.extension(type) || undefined,
			fileType,
			size,
		};
	}
	if (USES_REQUIRE.test(args.code)) globals.require = codeRequire();
	if (USES_JMESPATH.test(args.code)) globals.__wfJmespath = jmespathText;
	if (timers && USES_HTTP.test(args.code)) globals.__wfHttpRequest = httpRequestText;
	if (timers)
		Object.assign(globals, {
			setTimeout,
			clearTimeout,
			setInterval,
			clearInterval,
			setImmediate,
			clearImmediate,
		});
	// Without timers the context drains its own microtasks before `runInContext` returns, so the
	// timeout covers the whole code. With timers, the code goes on in the event loop.
	const context = createContext(globals, {
		codeGeneration: { strings: false, wasm: false },
		...(timers ? {} : { microtaskMode: 'afterEvaluate' as const }),
	});
	try {
		HELPERS.runInContext(context);
		if (USES_LUXON.test(args.code)) luxon().runInContext(context);
	} catch (error) {
		throw new CodeStepError(`The code globals did not load: ${messageOf(error)}`);
	}
	return { script, context };
}

export function runCodeStep(args: CodeStepArgs, options: CodeStepOptions = {}): JsonObject[] {
	const timeout = options.timeoutMs ?? DEFAULT_CODE_TIMEOUT_MS;
	const { script, context } = prepare(args, false);
	let outcome: unknown;
	try {
		outcome = script.runInContext(context, { timeout, breakOnSigint: false });
	} catch (error) {
		if (isTimeout(error)) throw new CodeStepError(`Code did not finish within ${timeout} ms`);
		throw new CodeStepError(messageOf(error));
	}
	return finish(outcome, options);
}

/**
 * Code that needs the event loop: timers (`setTimeout`, …), which n8n's JavaScript
 * runner gives, or `this.helpers.httpRequest`.
 */
const USES_TIMERS = /\b(?:setTimeout|setInterval|setImmediate)\s*\(|\bhttpRequest\b/;

const USES_HTTP = /\bhttpRequest\b/;

/**
 * `httpRequest` of n8n's helpers, with `fetch`: `method`, `url`, `qs`, `headers`,
 * `body` (JSON for an object), `json`, `returnFullResponse`. A status of 400 or
 * more fails, as in n8n. The result is JSON text, so no host object reaches the code.
 */
function textOf(value: unknown): string {
	return typeof value === 'string' ? value : JSON.stringify(value);
}

async function httpRequestText(optionsText: string): Promise<string> {
	const options: unknown = JSON.parse(optionsText);
	if (typeof options !== 'object' || options === null) throw new Error('httpRequest needs options');
	const read = (key: string): unknown => Reflect.get(options, key);
	const address = read('url') ?? read('uri');
	const url = new URL(typeof address === 'string' ? address : '');
	const qs = read('qs');
	if (typeof qs === 'object' && qs !== null) {
		for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, textOf(v));
	}
	const headers: Record<string, string> = {};
	const given = read('headers');
	if (typeof given === 'object' && given !== null) {
		for (const [k, v] of Object.entries(given)) headers[k] = textOf(v);
	}
	const body = read('body');
	let payload: string | undefined;
	if (body !== undefined && body !== null) {
		if (typeof body === 'string') payload = body;
		else {
			payload = JSON.stringify(body);
			headers['content-type'] ??= 'application/json';
		}
	}
	const verb = read('method');
	const method = typeof verb === 'string' ? verb : 'GET';
	const response = await fetch(url, { method, headers, body: payload });
	const text = await response.text();
	let parsed: unknown = text;
	const type = response.headers.get('content-type') ?? '';
	if (read('json') === true || type.includes('application/json')) {
		try {
			parsed = text === '' ? '' : JSON.parse(text);
		} catch {
			parsed = text;
		}
	}
	if (response.status >= 400) {
		throw new Error(`Request failed with status code ${response.status}`);
	}
	if (read('returnFullResponse') === true) {
		return JSON.stringify({
			body: parsed,
			headers: Object.fromEntries(response.headers.entries()),
			statusCode: response.status,
			statusMessage: response.statusText,
		});
	}
	return JSON.stringify(parsed);
}

/**
 * Runs a code step. Code with timers runs in the event loop until it settles or
 * the timeout ends; other code runs as `runCodeStep` does.
 */
export async function runCodeStepAsync(
	args: CodeStepArgs,
	options: CodeStepOptions = {},
): Promise<JsonObject[]> {
	if (!USES_TIMERS.test(args.code)) return runCodeStep(args, options);
	const timeout = options.timeoutMs ?? DEFAULT_CODE_TIMEOUT_MS;
	const { script, context } = prepare(args, true);
	let outcome: unknown;
	try {
		outcome = script.runInContext(context, { timeout, breakOnSigint: false });
	} catch (error) {
		if (isTimeout(error)) throw new CodeStepError(`Code did not finish within ${timeout} ms`);
		throw new CodeStepError(messageOf(error));
	}
	const deadline = Date.now() + timeout;
	while (isScriptOutcome(outcome) && outcome.done !== true && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	if (isScriptOutcome(outcome) && outcome.done !== true) {
		throw new CodeStepError(`Code did not finish within ${timeout} ms`);
	}
	return finish(outcome, options);
}

/** The items of a finished code step, from the wrapper's outcome. */
function finish(outcome: unknown, options: CodeStepOptions): JsonObject[] {
	if (!isScriptOutcome(outcome) || outcome.done !== true) {
		throw new CodeStepError('Code did not finish: it waits for a value that never settles');
	}
	if (typeof outcome.error === 'string') throw new CodeStepError(outcome.error);
	if (typeof outcome.staticJson === 'string' && options.onStaticData) {
		const doc: unknown = JSON.parse(outcome.staticJson);
		if (isJsonObject(doc)) options.onStaticData(doc);
	}
	if (typeof outcome.json !== 'string') {
		throw new CodeStepError('Code returned a value that is not JSON');
	}

	const value: unknown = JSON.parse(outcome.json);
	try {
		return toResultItems(value);
	} catch (error) {
		throw new CodeStepError(
			`Code must return an object or an array of objects. ${messageOf(error)}`,
		);
	}
}

function isTimeout(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT'
	);
}

export function messageOf(error: unknown): string {
	if (typeof error === 'object' && error !== null && 'message' in error) {
		return String(error.message);
	}
	return String(error);
}
