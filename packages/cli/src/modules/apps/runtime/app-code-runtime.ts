import { FilterConditionSchema, dataTableFilterTypeSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { createHash } from 'node:crypto';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { actionUrlParts } from './action-url';
import { AppIsolatePool, type AppIsolateSlot } from './app-isolate-pool';
import type { AppActionContext, AppPageContext, PageContextInput } from './page-context.factory';

export class AppCodeError extends Error {}

export interface AppActionResult {
	redirect?: string;
	data?: unknown;
	error?: string;
}

export interface AppCodeRunResult<T> {
	value: T;
	/** `ctx.log(...)` lines, in call order. */
	logs: string[];
}

const CALL_TIMEOUT_MS = 5000;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MEMORY_LIMIT_MB = 32;
const MAX_HOST_CALLS_PER_RUN = 20;
const COMPILE_CACHE_SIZE = 50;

// ---------------------------------------------------------------------------
// Host call dispatch — one JSON-in/JSON-out envelope per `ctx.*` operation the
// isolate performs, resolved against the real `PageContext`/`ActionContext`
// (`page-context.factory.ts`) so the isolate and the typed-block renderers
// share the exact same host behaviour.
// ---------------------------------------------------------------------------

const rowValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const rowDataSchema = z.record(rowValueSchema);
// `dataTableFilterSchema` (the object wrapper) isn't re-exported from
// `@n8n/api-types`'s package root — only its pieces are — so the wrapper is
// recomposed here from those.
const dataTableFilterSchema = z.object({
	type: dataTableFilterTypeSchema,
	filters: z.array(
		z.object({ columnName: z.string(), condition: FilterConditionSchema, value: rowValueSchema }),
	),
});
const rowsOptionsSchema = z.object({
	filter: dataTableFilterSchema.optional(),
	sortBy: z.tuple([z.string(), z.enum(['ASC', 'DESC'])]).optional(),
	take: z.number().optional(),
	skip: z.number().optional(),
});
const filterDataSchema = z.object({ filter: dataTableFilterSchema, data: rowDataSchema });
const filterOnlySchema = z.object({ filter: dataTableFilterSchema });
const fetchInitSchema = z.object({
	method: z.string().optional(),
	headers: z.record(z.string()).optional(),
	body: z.string().optional(),
});

type HostMethod = (ctx: AppPageContext | AppActionContext, args: unknown[]) => Promise<unknown>;

const HOST_METHODS: Record<string, HostMethod> = {
	'dataTables.list': async (ctx) => await ctx.dataTables.list(),
	'dataTables.get': async (ctx, args) => {
		const [id] = z.tuple([z.string()]).parse(args);
		const handle = await ctx.dataTables.get(id);
		return { id: handle.id, name: handle.name };
	},
	'dataTables.getColumns': async (ctx, args) => {
		const [id] = z.tuple([z.string()]).parse(args);
		return await (await ctx.dataTables.get(id)).getColumns();
	},
	'dataTables.getManyRowsAndCount': async (ctx, args) => {
		const [id, options] = z.tuple([z.string(), rowsOptionsSchema.optional()]).parse(args);
		return await (await ctx.dataTables.get(id)).getManyRowsAndCount(options);
	},
	'dataTables.insertRows': async (ctx, args) => {
		const [id, rows] = z.tuple([z.string(), z.array(rowDataSchema)]).parse(args);
		return await (await ctx.dataTables.get(id)).insertRows(rows);
	},
	'dataTables.updateRows': async (ctx, args) => {
		const [id, options] = z.tuple([z.string(), filterDataSchema]).parse(args);
		return await (await ctx.dataTables.get(id)).updateRows(options);
	},
	'dataTables.upsertRow': async (ctx, args) => {
		const [id, options] = z.tuple([z.string(), filterDataSchema]).parse(args);
		return await (await ctx.dataTables.get(id)).upsertRow(options);
	},
	'dataTables.deleteRows': async (ctx, args) => {
		const [id, options] = z.tuple([z.string(), filterOnlySchema]).parse(args);
		return await (await ctx.dataTables.get(id)).deleteRows(options);
	},
	'workflows.list': async (ctx) => await ctx.workflows.list(),
	'workflows.execute': async (ctx, args) => {
		const [id, input] = z.tuple([z.string(), z.record(z.unknown()).optional()]).parse(args);
		return await ctx.workflows.execute(id, input);
	},
	'workflows.getForm': async (ctx, args) => {
		const [id] = z.tuple([z.string()]).parse(args);
		return await ctx.workflows.getForm(id);
	},
	'workflows.submitForm': async (ctx, args) => {
		const [id, fields] = z.tuple([z.string(), z.record(z.unknown())]).parse(args);
		return await ctx.workflows.submitForm(id, fields);
	},
	'credentials.get': async (ctx, args) => {
		const [name] = z.tuple([z.string()]).parse(args);
		return await ctx.credentials.get(name);
	},
	fetch: async (ctx, args) => {
		const [url, init] = z.tuple([z.string(), fetchInitSchema.optional()]).parse(args);
		const response = await ctx.fetch(url, init);
		return { status: response.status, headers: response.headers, body: await response.text() };
	},
};

/** `Date` values become `{ __appDate }` markers; the isolate prelude revives them. */
const withDateMarkers = (_key: string, value: unknown): unknown =>
	value instanceof Date ? { __appDate: value.toISOString() } : value;

// ---------------------------------------------------------------------------
// Isolate-side SDK. Builds `ctx` from static per-render data plus the two
// host callbacks: `__hostCall` (async, JSON envelope in/out) and `__hostLog`
// (fire-and-forget). No `require`/`import` is provided, so referencing either
// is a `ReferenceError` inside the isolate — the compile-error behaviour the
// spec calls for comes for free from the empty global scope.
// ---------------------------------------------------------------------------

const ISOLATE_SDK = `
function __reviveDates(json) {
	return JSON.parse(json, function (key, value) {
		if (value && typeof value === 'object' && typeof value.__appDate === 'string') {
			return new Date(value.__appDate);
		}
		return value;
	});
}
async function __call(method, args) {
	var json = await __hostCall.apply(undefined, [method, JSON.stringify(args)], { arguments: { copy: true }, result: { promise: true, copy: true } });
	var envelope = __reviveDates(json);
	if (!envelope.ok) throw new Error(envelope.error);
	return envelope.value;
}
function __dataTableHandle(info) {
	return {
		id: info.id,
		name: info.name,
		getColumns: function () { return __call('dataTables.getColumns', [info.id]); },
		getManyRowsAndCount: function (options) { return __call('dataTables.getManyRowsAndCount', [info.id, options]); },
		insertRows: function (rows) { return __call('dataTables.insertRows', [info.id, rows]); },
		updateRows: function (options) { return __call('dataTables.updateRows', [info.id, options]); },
		upsertRow: function (options) { return __call('dataTables.upsertRow', [info.id, options]); },
		deleteRows: function (options) { return __call('dataTables.deleteRows', [info.id, options]); },
	};
}
function __buildCtx(staticData) {
	return {
		app: staticData.app,
		page: staticData.page,
		params: staticData.params,
		query: staticData.query,
		viewer: staticData.viewer,
		menu: staticData.menu,
		input: staticData.input,
		dataTables: {
			list: function () { return __call('dataTables.list', []); },
			get: async function (idOrName) {
				return __dataTableHandle(await __call('dataTables.get', [idOrName]));
			},
		},
		workflows: {
			list: function () { return __call('workflows.list', []); },
			execute: function (id, input) { return __call('workflows.execute', [id, input]); },
			getForm: function (id) { return __call('workflows.getForm', [id]); },
			submitForm: function (id, fields) { return __call('workflows.submitForm', [id, fields]); },
		},
		credentials: {
			get: function (name) { return __call('credentials.get', [name]); },
		},
		actionUrl: function (name) {
			return staticData.actionUrl.prefix + name + staticData.actionUrl.suffix;
		},
		fetch: async function (url, init) {
			var res = await __call('fetch', [url, init || {}]);
			return {
				status: res.status,
				headers: res.headers,
				text: function () { return Promise.resolve(res.body); },
				json: function () { return Promise.resolve(JSON.parse(res.body)); },
			};
		},
		log: function () {
			__hostLog(JSON.stringify(Array.prototype.slice.call(arguments)));
		},
	};
}
var __VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
var __URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'poster']);
var __HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function __escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, function (c) { return __HTML_ESCAPES[c]; });
}
function raw(html) {
	var text = String(html);
	return { __html: text, toString: function () { return text; } };
}
function __toHtml(value, escapeText) {
	if (value === null || value === undefined || typeof value === 'boolean') return '';
	if (typeof value === 'string') return escapeText ? __escapeHtml(value) : value;
	if (typeof value === 'number') return String(value);
	if (Array.isArray(value)) {
		return value.map(function (item) { return __toHtml(item, escapeText); }).join('');
	}
	if (typeof value === 'object' && typeof value.__html === 'string') return value.__html;
	throw new Error('render() must return HTML, text, a number, null or an array of those');
}
function __styleToString(style) {
	return Object.keys(style).map(function (key) {
		var name = key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
		return name + ': ' + style[key] + ';';
	}).join(' ');
}
function __isSafeUrl(value) {
	var scheme = /^\\s*([a-z][a-z0-9+.-]*):/i.exec(value);
	return !scheme || /^(https?|mailto|tel)$/i.test(scheme[1]);
}
function __attributes(props) {
	var out = '';
	for (var key in props) {
		var value = props[key];
		if (key === 'children' || value === null || value === undefined || value === false) continue;
		if (key === 'style' && typeof value === 'object') value = __styleToString(value);
		if (__URL_ATTRIBUTES.has(key) && !__isSafeUrl(String(value))) continue;
		var name = key === 'className' ? 'class' : key === 'htmlFor' ? 'for' : key;
		out += value === true ? ' ' + name : ' ' + name + '="' + __escapeHtml(value) + '"';
	}
	return out;
}
function Fragment(props) {
	return raw(__toHtml(props.children, true));
}
function h(tag, props) {
	var children = Array.prototype.slice.call(arguments, 2);
	if (typeof tag === 'function') {
		return raw(__toHtml(tag(Object.assign({}, props, { children: children })), true));
	}
	var open = '<' + tag + __attributes(props || {}) + '>';
	if (__VOID_ELEMENTS.has(tag)) return raw(open);
	return raw(open + __toHtml(children, true) + '</' + tag + '>');
}
`;

export interface RunStaticData extends Omit<PageContextInput, 'logs'> {
	/** Present only for an action call. */
	input?: Record<string, unknown>;
}

/**
 * Compiles and runs an App `code` block's TSX source in an `isolated-vm`
 * isolate against the real `PageContext`, per `code-api.md`. JSX compiles to
 * the prelude's `h`/`Fragment`, which build escaped HTML.
 *
 * Adapted from the isolate-execution pattern in
 * `packages/cli/src/modules/agents/runtime/agent-secure-runtime.ts` (by
 * @elsmr's original agents runtime), trimmed: a code block gets no pre-bundled
 * library, so there is nothing to `require()` inside the isolate at all.
 */
@Service()
export class AppCodeRuntime {
	private pool: AppIsolatePool | null = null;

	private poolInitPromise: Promise<AppIsolatePool> | null = null;

	/** Sucrase output, keyed by a content hash of the block's source. */
	private readonly compileCache = new Map<string, string>();

	constructor(private readonly logger: Logger) {}

	private async getPool(): Promise<AppIsolatePool> {
		if (this.pool) return this.pool;
		this.poolInitPromise ??= (async () => {
			const ivmModule = (await import('isolated-vm')).default;
			const pool = new AppIsolatePool(ivmModule, {
				memoryLimit: MEMORY_LIMIT_MB,
				logger: this.logger,
			});
			await pool.initialize();
			this.pool = pool;
			return pool;
		})();
		return await this.poolInitPromise;
	}

	private async compile(source: string): Promise<string> {
		const hash = createHash('sha256').update(source).digest('hex');
		const cached = this.compileCache.get(hash);
		if (cached) return cached;

		const { transform } = await import('sucrase');
		const { code } = transform(source, {
			transforms: ['typescript', 'jsx', 'imports'],
			jsxRuntime: 'classic',
			jsxPragma: 'h',
			jsxFragmentPragma: 'Fragment',
			production: true,
		});

		if (this.compileCache.size >= COMPILE_CACHE_SIZE) {
			const oldestKey = this.compileCache.keys().next().value;
			if (oldestKey !== undefined) this.compileCache.delete(oldestKey);
		}
		this.compileCache.set(hash, code);
		return code;
	}

	/** `render(ctx)`. Returns the HTML string and any `ctx.log(...)` lines. */
	async render(
		source: string,
		ctx: AppPageContext,
		staticData: RunStaticData,
	): Promise<AppCodeRunResult<string>> {
		const code = await this.compile(source);
		const runScript = `
			return (async function () {
				var module = { exports: {} };
				(function (exports, module) {
					${code}
				})(module.exports, module);
				if (typeof module.exports.render !== 'function') {
					throw new Error("This code block does not export a 'render' function");
				}
				var __ctx = __buildCtx($0);
				return __toHtml(await module.exports.render(__ctx), false);
			})();
		`;
		const { value, logs } = await this.run<string>(runScript, ctx, staticData);
		if (Buffer.byteLength(value, 'utf8') > MAX_OUTPUT_BYTES) {
			throw new AppCodeError('render() output exceeded the 1 MB limit');
		}
		return { value, logs };
	}

	/** `actions[name](ctx)`. Returns the raw action result and any log lines. */
	async runAction(
		source: string,
		name: string,
		ctx: AppActionContext,
		staticData: RunStaticData,
	): Promise<AppCodeRunResult<AppActionResult>> {
		const code = await this.compile(source);
		const runScript = `
			return (async function () {
				var module = { exports: {} };
				(function (exports, module) {
					${code}
				})(module.exports, module);
				var actionFn = module.exports.actions && module.exports.actions[${JSON.stringify(name)}];
				if (typeof actionFn !== 'function') {
					throw new Error(${JSON.stringify(`This code block has no action named "${name}"`)});
				}
				var __ctx = __buildCtx($0);
				var result = await actionFn(__ctx);
				if (!result || typeof result !== 'object') {
					throw new Error('An action must return { redirect } or { data } or { error }');
				}
				return result;
			})();
		`;
		return await this.run<AppActionResult>(runScript, ctx, { ...staticData, input: ctx.input });
	}

	private async run<T>(
		runScript: string,
		ctx: AppPageContext | AppActionContext,
		staticData: RunStaticData,
	): Promise<AppCodeRunResult<T>> {
		const pool = await this.getPool();
		const slot = await pool.acquire();
		let disposeSlot = false;
		try {
			const context = slot.createContext();
			const logs: string[] = [];
			let hostCallCount = 0;

			try {
				const ivmModule = (await import('isolated-vm')).default;

				// A `Reference` applied with `result: { promise: true }`: an async
				// `Callback` hands the isolate a Promise it cannot clone (isolated-vm 7).
				context.global.setSync(
					'__hostCall',
					new ivmModule.Reference(async (method: unknown, argsJson: unknown) => {
						hostCallCount++;
						if (hostCallCount > MAX_HOST_CALLS_PER_RUN) {
							return JSON.stringify({
								ok: false,
								error: `This block made more than ${MAX_HOST_CALLS_PER_RUN} host calls in one render`,
							});
						}
						return await this.dispatch(ctx, method, argsJson);
					}),
				);
				context.global.setSync(
					'__hostLog',
					new ivmModule.Callback(
						(message: unknown) => {
							logs.push(typeof message === 'string' ? message : String(message));
						},
						{ ignored: true },
					),
				);

				context.evalSync(ISOLATE_SDK, { timeout: CALL_TIMEOUT_MS });

				const timeout = new Promise<never>((_, reject) => {
					setTimeout(() => {
						disposeSlot = true;
						reject(new AppCodeError('Code block timed out after 5 seconds'));
					}, CALL_TIMEOUT_MS).unref();
				});

				const value = (await Promise.race([
					context.evalClosure(
						runScript,
						[{ ...staticData, actionUrl: actionUrlParts(staticData) }],
						{
							timeout: CALL_TIMEOUT_MS,
							arguments: { copy: true },
							result: { promise: true, copy: true },
						},
					),
					timeout,
				])) as T;

				return { value, logs };
			} finally {
				context.release();
			}
		} catch (error) {
			disposeSlot = disposeSlot || !slot.isHealthy;
			throw error instanceof Error ? new AppCodeError(error.message) : error;
		} finally {
			if (disposeSlot) slot.dispose();
			pool.release(slot);
		}
	}

	private async dispatch(
		ctx: AppPageContext | AppActionContext,
		method: unknown,
		argsJson: unknown,
	): Promise<string> {
		try {
			if (typeof method !== 'string' || typeof argsJson !== 'string') {
				throw new UserError('Malformed host call');
			}
			const handler = HOST_METHODS[method];
			if (!handler) throw new UserError(`Unknown host call "${method}"`);

			const args = JSON.parse(argsJson) as unknown[];
			const value = await handler(ctx, args);
			return JSON.stringify({ ok: true, value }, withDateMarkers);
		} catch (error) {
			return JSON.stringify({
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async dispose(): Promise<void> {
		const pool = this.pool;
		this.pool = null;
		this.poolInitPromise = null;
		if (pool) await pool.dispose();
	}
}

// Re-exported so callers don't need to reach into `page-context.factory.ts`
// just to type a render/action call.
export type { AppActionContext, AppPageContext } from './page-context.factory';
export type { AppIsolateSlot };
