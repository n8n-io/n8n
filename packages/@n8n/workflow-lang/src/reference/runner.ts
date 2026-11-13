import { findNodeDefinition, getProperty, stringLiteralValue } from '../compiler/analysis.ts';
import { selectNodeSources } from '../library/node-sources.ts';
import * as sdk from '../sdk/index.ts';
import ts from 'typescript';
import { compileFunction } from 'node:vm';

import { transpileForReference } from './transform.ts';
import { zoneOffset } from './zone-lib.ts';
import { regexExec } from './regex-lib.ts';
import { StaticDataDoc } from './static-data.ts';
import { xmlContent, xmlParse, xmlSnippet } from './xml-lib.ts';
import { asciiIs, asciiIsPrintable, base64Utf8 } from './ascii-lib.ts';

/** A differential test fixture (spec section 6). */
export interface Fixture {
	trigger: unknown;
	now: number;
	seed: number | string;
	effects: Record<string, unknown[]>;
	/** Run with tracing on: the output lists the `ctx.trace` calls. */
	trace?: boolean;
	/** What `ctx.execution()` gives (spec 6). */
	execution?: FixtureExecution;
	/** What `ctx.vars()` gives. */
	vars?: Record<string, string>;
	/** The workflow static data at the start (spec 9.7). The output then has the document at the end. */
	staticData?: Record<string, unknown>;
}

export interface FixtureExecution {
	/** `test`: a manual run with the n8n id `id`. `production`: a trigger run, id `wfrt-1`. */
	mode?: 'test' | 'production';
	/** A decimal string; only for `test`. Default `1`. */
	id?: string;
	/** Default `/resume`. */
	resumeUrlBase?: string;
	/** Default `resumeUrlBase`. */
	resumeFormUrlBase?: string;
}

/** The value of `ctx.execution()` for a fixture. */
export function executionInfo(fixture: Fixture) {
	const ex = fixture.execution ?? {};
	const mode = ex.mode ?? 'production';
	const id = mode === 'test' ? (ex.id ?? '1') : 'wfrt-1';
	const base = ex.resumeUrlBase ?? '/resume';
	const form = ex.resumeFormUrlBase ?? base;
	return { id, mode, resumeUrl: `${base}/${id}`, resumeFormUrl: `${form}/${id}` };
}

export type EffectKindName = 'node' | 'http' | 'code' | 'wait' | 'approval' | 'respond' | 'service';

export interface EffectRecord {
	step: string;
	kind: EffectKindName;
	args: unknown;
}

/** One `ctx.trace` call. `items` is a JSON copy; `undefined` becomes `null`. */
export interface TraceRecord {
	step: string;
	items: unknown;
}

export interface ReferenceOutput {
	status: 'ok' | 'error' | 'needs_attention' | 'limit';
	result?: unknown;
	effects: EffectRecord[];
	staticData?: Record<string, unknown>;
	trace?: TraceRecord[];
}

/** The `ctx.trace` record of spec section 6. */
export function traceRecord(name: unknown, items: unknown): TraceRecord {
	return { step: String(name), items: jsonCopy(items) ?? null };
}

interface Fibre {
	tryDepth: number;
}

type Continuation = () => void;

interface NodeRun {
	run: (ctx: unknown, parameters: unknown, items: unknown, credential: unknown) => Promise<unknown>;
}

const MASK = (1n << 64n) - 1n;

/** splitmix64, as in spec section 6. */
export function splitmix64(seed: number | string): () => number {
	let state = BigInt(seed) & MASK;
	return () => {
		state = (state + 0x9e3779b97f4a7c15n) & MASK;
		let z = state;
		z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK;
		z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK;
		z = z ^ (z >> 31n);
		return Number(z >> 11n) * 2 ** -53;
	};
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Copies a value with JSON semantics: `undefined` and functions drop out. */
export function jsonCopy(v: unknown): unknown {
	if (v === undefined) return undefined;
	const text = JSON.stringify(v);
	return text === undefined ? undefined : JSON.parse(text);
}

const clone = jsonCopy;

class Abort {
	readonly step: string;

	constructor(step: string) {
		this.step = step;
	}
}

/** Loads a CommonJS module text and returns its default export. */
function loadModule(code: string, runtime: unknown): unknown {
	const module: { exports: Record<string, unknown> } = { exports: {} };
	const require = (name: string) => {
		if (name === '@n8n/workflow-lang') return sdk;
		throw new Error(`cannot require ${name}`);
	};
	const fn = compileFunction(code, ['exports', 'require', 'module', '__rt']);
	fn(module.exports, require, module, runtime);
	return module.exports.default;
}

function nodeLibrary(sources: Record<string, string>, runtime: unknown): Map<string, NodeRun> {
	const out = new Map<string, NodeRun>();
	for (const [file, text] of Object.entries(sources)) {
		const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
		const def = findNodeDefinition(sf);
		const type = def ? stringLiteralValue(getProperty(def.options, 'type')?.initializer) : null;
		if (!type) continue;
		const loaded = loadModule(transpileForReference(text, file), runtime);
		if (isRecord(loaded) && typeof loaded.run === 'function') {
			const run = loaded.run;
			out.set(type, {
				run: async (ctx, parameters, items, credential) =>
					await run(ctx, parameters, items, credential),
			});
		}
	}
	return out;
}

/**
 * Runs a workflow in Node.js with a stub ctx driven by a fixture. The
 * scheduler runs one fibre at a time, in the order of the run queue, so the
 * effect order is the same as in the runtime.
 */
export async function runReference(
	source: string,
	fixture: Fixture,
	options: { nodes?: Record<string, string>; fileName?: string } = {},
): Promise<ReferenceOutput> {
	// Workflows run in UTC: local-time Date methods equal the UTC methods.
	useUtc();
	const effects: EffectRecord[] = [];
	const traces: TraceRecord[] = [];
	const queue: Continuation[] = [];
	const consumed = new Map<string, number>();
	const random = splitmix64(fixture.seed);
	const statics = new StaticDataDoc(fixture.staticData);
	let clock = fixture.now;
	let current: Fibre = { tryDepth: 0 };
	// Closures set these, so they live in an object that the checker does not narrow.
	const state: { abort: Abort | null; finished: ReferenceOutput | null } = {
		abort: null,
		finished: null,
	};

	const park = async <T>(
		fibre: Fibre,
		settle: (resolve: (v: T) => void, reject: (e: unknown) => void) => void,
	) =>
		await new Promise<T>((resolve, reject) => {
			queue.push(() => {
				current = fibre;
				settle(resolve, reject);
			});
		});

	const nextResult = (step: string): unknown => {
		const list = fixture.effects[step];
		if (!list || list.length === 0) return undefined;
		const n = consumed.get(step) ?? 0;
		consumed.set(step, n + 1);
		return clone(list[n % list.length]);
	};

	const effect = async (
		step: string,
		kind: EffectKindName,
		args: unknown,
		retryMax: number,
	): Promise<unknown> => {
		const fibre = current;
		let attempt = 0;
		let result: unknown;
		for (;;) {
			effects.push({ step, kind, args: clone(args) });
			result = nextResult(step);
			const failed = isRecord(result) && '$error' in result;
			if (!failed || attempt >= retryMax) break;
			attempt++;
		}
		return await park(fibre, (resolve, reject) => {
			if (isRecord(result) && '$error' in result) {
				if (fibre.tryDepth > 0) {
					reject({ name: 'NodeError', message: String(result.$error), step });
				} else {
					state.abort ??= new Abort(step);
				}
				return;
			}
			if (kind === 'wait' && isRecord(args)) {
				if (typeof args.duration === 'number') clock += args.duration;
				if (typeof args.until === 'number') clock = Math.max(clock, args.until);
			}
			resolve(kind === 'wait' || kind === 'respond' ? undefined : result);
		});
	};

	const retryOf = (opts: unknown) => {
		const retry = isRecord(opts) ? opts.retry : undefined;
		return isRecord(retry) && typeof retry.max === 'number' ? retry.max : 0;
	};
	const stepName = (opts: unknown) => (isRecord(opts) ? String(opts.name) : 'unknown');

	const runtime = {
		now: () => clock,
		enter: () => {
			current.tryDepth++;
		},
		leave: () => {
			current.tryDepth--;
		},
		error: (name: string, message?: unknown) => ({
			name,
			message: message === undefined ? '' : String(message),
		}),
		regexExec,
		asciiIs,
		asciiIsPrintable,
		base64Utf8,
		xmlParse,
		xmlSnippet,
		xmlContent,
		zoneOffset: (zone: unknown, t: unknown) => zoneOffset(String(zone), Number(t)),
		all: async (thunks: Array<() => Promise<unknown>>) => await fork(thunks),
		allMap: async (items: unknown[], mapper: (x: unknown) => Promise<unknown>) =>
			await fork(items.map((x) => async () => await mapper(x))),
	};

	const fork = async (thunks: Array<() => Promise<unknown>>): Promise<unknown[]> => {
		const parent = current;
		const results: Array<{ ok: boolean; value: unknown }> = [];
		let done = 0;
		return await new Promise<unknown[]>((resolve, reject) => {
			const finishJoin = () => {
				queue.push(() => {
					current = parent;
					const failed = results.find((r) => !r.ok);
					if (failed) reject(failed.value);
					else resolve(results.map((r) => r.value));
				});
			};
			if (thunks.length === 0) {
				finishJoin();
				return;
			}
			thunks.forEach((thunk, i) => {
				const fibre: Fibre = { tryDepth: 0 };
				queue.push(() => {
					current = fibre;
					thunk().then(
						(value) => {
							results[i] = { ok: true, value };
							if (++done === thunks.length) finishJoin();
						},
						(value: unknown) => {
							results[i] = { ok: false, value };
							if (++done === thunks.length) finishJoin();
						},
					);
				});
			});
		});
	};

	const library = nodeLibrary(options.nodes ?? selectNodeSources(source), runtime);

	const ctx = {
		node: async (opts: unknown) => {
			const type = isRecord(opts) ? opts.type : undefined;
			const lib = typeof type === 'string' ? library.get(type) : undefined;
			// `host: 'fallback'` never links (spec 4.2).
			if (lib && isRecord(opts) && opts.host !== 'fallback') {
				const step = stepName(opts);
				const nodeCtx = {
					http: async (req: unknown) => await effect(step, 'http', req, retryOf(opts)),
					service: async (req: unknown) => await effect(step, 'service', req, retryOf(opts)),
					staticData: (type: unknown, node: unknown) => statics.get(type, node),
				};
				return await lib.run(nodeCtx, opts.parameters, opts.items, opts.credential);
			}
			return await effect(stepName(opts), 'node', opts, retryOf(opts));
		},
		http: async (opts: unknown) => await effect(stepName(opts), 'http', opts, retryOf(opts)),
		code: async (opts: unknown) => await effect(stepName(opts), 'code', opts, 0),
		wait: async (opts: unknown) => await effect(stepName(opts), 'wait', opts, 0),
		approval: async (opts: unknown) => await effect(stepName(opts), 'approval', opts, 0),
		respond: async (opts: unknown) => await effect(stepName(opts), 'respond', opts, 0),
		service: async (opts: unknown) => await effect(stepName(opts), 'service', opts, retryOf(opts)),
		now: () => clock,
		random,
		trace: (name: unknown, items: unknown) => {
			if (fixture.trace === true) traces.push(traceRecord(name, items));
		},
		execution: () => executionInfo(fixture),
		vars: () => clone(fixture.vars ?? {}),
		staticData: (type: unknown, node: unknown) => statics.get(type, node),
		polled: (items: unknown) => Array.isArray(items) && items.length > 0,
	};

	const def = loadModule(transpileForReference(source, options.fileName ?? 'workflow.ts'), runtime);
	if (!isRecord(def) || typeof def.run !== 'function')
		throw new Error('the workflow has no run function');
	const run = def.run;
	const main: Fibre = { tryDepth: 0 };
	queue.push(() => {
		current = main;
		Promise.resolve(run(ctx, clone(fixture.trigger))).then(
			(value: unknown) => {
				state.finished = { status: 'ok', result: value, effects };
			},
			(error: unknown) => {
				state.finished = { status: 'error', result: plainError(error), effects };
			},
		);
	});
	const MAX_STEPS = 1_000_000;
	for (let i = 0; i < MAX_STEPS && !state.finished && !state.abort; i++) {
		const next = queue.shift();
		if (!next) throw new Error('deadlock: no runnable fibre');
		next();
		await new Promise((r) => setImmediate(r));
	}
	const out: ReferenceOutput = state.abort
		? { status: 'needs_attention', result: { step: state.abort.step }, effects }
		: (state.finished ?? { status: 'limit', effects });
	const staticData = statics.final(out.status);
	const withStatic = staticData === undefined ? out : { ...out, staticData };
	return normalize(fixture.trace === true ? { ...withStatic, trace: traces } : withStatic);
}

/** Sets the time zone of this process to UTC (spec section 4.5). Node reads TZ at once. */
export function useUtc(): void {
	if (process.env.TZ !== 'UTC') process.env.TZ = 'UTC';
}

function plainError(e: unknown): unknown {
	if (e instanceof Error) return { name: e.name, message: e.message };
	return e;
}

/** Orders the keys as the spec requires and drops an undefined result. */
function normalize(out: ReferenceOutput): ReferenceOutput {
	const result: ReferenceOutput =
		out.result === undefined
			? { status: out.status, effects: out.effects }
			: { status: out.status, result: clone(out.result), effects: out.effects };
	if (out.staticData) result.staticData = out.staticData;
	if (out.trace) result.trace = out.trace;
	const text = JSON.stringify(result);
	return JSON.parse(text);
}
