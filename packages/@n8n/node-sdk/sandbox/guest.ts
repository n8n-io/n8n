// The generic JS guest of the sandbox: one WASM component for every JS action bundle. It
// runs the bundle and gives it the run context over the imports of the action world. The
// bundle runs in the same JS realm, so this code is not a trust boundary: the sidecar links
// only the granted imports, and the host checks every call and every output.
import { source } from 'n8n:js-guest/bundle@1.0.0';
import * as witTables from 'n8n:node-contract/data-tables@2.5.0';
import { run as witCode } from 'n8n:node-contract/code@2.5.0';
import { request as witRequest, type HttpFailure } from 'n8n:node-contract/http@2.5.0';
import { get as witInputOf } from 'n8n:node-contract/input-of@2.5.0';
import { get as witLimits } from 'n8n:node-contract/limits@2.5.0';
import { log as witLog } from 'n8n:node-contract/log@2.5.0';
import { until as witUntil } from 'n8n:node-contract/wait@2.5.0';
import { safeRegex } from 'n8n-workflow';

import {
	isHttpError,
	type Action,
	type DataTable,
	type DataTableFilter,
	type DataTables,
	type HostImports,
	type Http,
	type HttpRequest,
	type InputItem,
} from '../src/define';
import { isDataTableRows } from '../src/host-imports';
import { listItems, requestOf } from '../src/runtime';
import type { Binary } from '../src/schema';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isAction = (value: unknown): value is Action =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	isRecord(value.flow) &&
	(typeof value.run === 'function' || isRecord(value.request) || isRecord(value.list));

// The engine has no network and no timers. A clear error is better than a trap.
const unavailable = (name: string, instead: string) => () => {
	throw new Error(`${name} is not available in the sandbox. ${instead}`);
};
Reflect.set(globalThis, 'fetch', unavailable('fetch', 'Use http.request.'));

// No WIT import carries the plain credential fields yet (backlog S13.8). The getter fails only
// when `run()` reads it.
const readCredential = unavailable('credential', 'Read the value from the input instead.');
const withNoCredential = <T extends object>(context: T) => ({
	...context,
	get credential(): never {
		return readCredential();
	},
});
Reflect.set(globalThis, 'setTimeout', unavailable('setTimeout', 'An action has no timers.'));
Reflect.set(globalThis, 'setInterval', unavailable('setInterval', 'An action has no timers.'));

// StarlingMonkey has no `URL.canParse` (ES2024 web API), which the SDK and bundles use.
if (typeof URL.canParse !== 'function') {
	Reflect.set(URL, 'canParse', (url: string, base?: string) => {
		try {
			return new URL(url, base) instanceof URL;
		} catch {
			return false;
		}
	});
}

/** Host modules a bundle may import, as in the host process. */
const HOST_MODULES: Readonly<Record<string, unknown>> = { 'n8n-workflow': { safeRegex } };

/** The bundle loads at the first call, not at build time: its source is an import. */
const loaded = new Map<'action', Action>();
function actionOf(): Action {
	const cached = loaded.get('action');
	if (cached) return cached;
	const module: { exports: unknown } = { exports: {} };
	const hostRequire = (id: string) => {
		if (!(id in HOST_MODULES)) throw new Error(`A frozen action cannot import ${id}`);
		return HOST_MODULES[id];
	};
	// The engine has no `node:vm`. The bundle runs in this realm either way.
	// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
	const evaluate = new Function('module', 'require', source());
	Reflect.apply(evaluate, undefined, [module, hostRequire]);
	const exported = isRecord(module.exports) ? module.exports.default : undefined;
	if (!isAction(exported)) throw new Error('The bundle does not export an action');
	loaded.set('action', exported);
	return exported;
}

const queryText = (value: unknown) =>
	typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);

const entriesOf = (record: Readonly<Record<string, unknown>> | undefined) =>
	Object.entries(record ?? {}).flatMap(
		([key, value]): Array<[string, string]> =>
			value === undefined
				? []
				: Array.isArray(value)
					? value.map((entry): [string, string] => [key, queryText(entry)])
					: [[key, queryText(value)]],
	);

const parsed = (text: string): unknown => JSON.parse(text);

function inputOf(text: string): Record<string, unknown> {
	const input = parsed(text);
	if (!isRecord(input)) throw new Error('The run input is not an object');
	return input;
}

/** The error that `http.request` throws for a failure of the host. */
function httpErrorOf(failure: HttpFailure): Error {
	if (failure.tag === 'transport') return new Error(failure.val);
	const { message, status, headers, body } = failure.val;
	return Object.assign(new Error(message), {
		status,
		headers: Object.fromEntries(headers),
		body: parsed(body),
	});
}

const payloadOf = (error: unknown): unknown =>
	isRecord(error) || error instanceof Error ? Reflect.get(error, 'payload') : undefined;

const isFailure = (value: unknown): value is HttpFailure =>
	isRecord(value) && (value.tag === 'transport' || value.tag === 'response');

function request(
	options: HttpRequest & { readonly response: 'binary'; readonly fullResponse?: false },
): Promise<Binary>;
function request(options: HttpRequest): Promise<unknown>;
async function request(request: HttpRequest): Promise<unknown> {
	if (request.response === 'binary') {
		throw new Error('The sandbox has no binary data yet');
	}
	const response = (() => {
		try {
			return witRequest({
				method: request.method ?? 'GET',
				target:
					request.url !== undefined
						? { tag: 'url', val: request.url }
						: { tag: 'path', val: request.path },
				query: entriesOf(request.query),
				headers: Object.entries(request.headers ?? {}),
				...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
				...(request.timeoutMs === undefined ? {} : { timeoutMs: request.timeoutMs }),
				...(request.retry === undefined ? {} : { retry: request.retry }),
			});
		} catch (error) {
			const failure = payloadOf(error);
			throw isFailure(failure) ? httpErrorOf(failure) : error;
		}
	})();
	const body = parsed(response.body);
	return request.fullResponse
		? { body, headers: Object.fromEntries(response.headers), statusCode: response.status }
		: body;
}

const http: Http = { request };

const log = (level: 'debug' | 'info' | 'warn' | 'error', message: string) =>
	witLog(level, String(message));

/** A WIT `result` error throws its payload text; the bundle sees an `Error`. */
function call<T>(run: () => T): T {
	try {
		return run();
	} catch (error) {
		const payload = payloadOf(error);
		throw typeof payload === 'string' ? new Error(payload) : error;
	}
}

const OPERATORS = { isEmpty: 'is-empty', isNotEmpty: 'is-not-empty' } as const;

const filterOf = (filter: DataTableFilter): witTables.Filter => ({
	match: filter.match,
	conditions: filter.conditions.map((condition) => ({
		column: condition.column,
		op:
			condition.op === 'isEmpty' || condition.op === 'isNotEmpty'
				? OPERATORS[condition.op]
				: condition.op,
		...('value' in condition ? { value: JSON.stringify(condition.value) } : {}),
	})),
});

function rowsOf(texts: readonly string[]) {
	const rows = texts.map(parsed);
	if (!isDataTableRows(rows)) throw new Error('The host gave rows in another shape');
	return rows;
}

function tableOf(table: witTables.Table): DataTable {
	return {
		id: table.id(),
		columns: async () => call(() => table.columns()),
		rows: async (query) =>
			call(() => {
				const page = table.rows({
					...(query.filter ? { filter: filterOf(query.filter) } : {}),
					...(query.sort ? { sort: query.sort } : {}),
					...(query.offset === undefined ? {} : { offset: query.offset }),
					limit: query.limit,
				});
				return { count: Number(page.count), rows: rowsOf(page.rows) };
			}),
		insert: async (rows) =>
			call(() => rowsOf(table.insert(rows.map((row) => JSON.stringify(row))))),
		update: async (filter, values) =>
			call(() => rowsOf(table.update(filterOf(filter), JSON.stringify(values)))),
		upsert: async (filter, values) =>
			call(() => rowsOf(table.upsert(filterOf(filter), JSON.stringify(values)))),
		delete: async (filter) => call(() => rowsOf(table.delete(filterOf(filter)))),
		clear: async () => call(() => Number(table.clear())),
		rename: async (name) => call(() => table.rename(name)),
		drop: async () => call(() => table.drop()),
	};
}

const TABLE_FIELDS = { name: 'name', createdAt: 'created-at', updatedAt: 'updated-at' } as const;

const dataTables: DataTables = {
	open: async (table) =>
		tableOf(
			call(() =>
				witTables.open(
					table.id !== undefined ? { tag: 'id', val: table.id } : { tag: 'name', val: table.name },
				),
			),
		),
	list: async (query) =>
		call(() => {
			const page = witTables.list({
				...(query.name === undefined ? {} : { name: query.name }),
				...(query.sort
					? { sort: { by: TABLE_FIELDS[query.sort.by], direction: query.sort.direction } }
					: {}),
				...(query.offset === undefined ? {} : { offset: query.offset }),
				limit: query.limit,
			});
			return { count: Number(page.count), tables: page.tables };
		}),
	create: async (table) => call(() => witTables.create({ ...table, columns: [...table.columns] })),
};

/** Every host import, as in the host process: the sidecar refuses one the manifest does not grant. */
const importsOf = (items: readonly InputItem[]): HostImports<Record<string, unknown>> => ({
	dataTables,
	code: { run: async (request) => call(() => parsed(witCode(request))) },
	wait: { until: async (at) => call(() => witUntil(BigInt(at.getTime()))) },
	inputOf: async (item) => {
		const index = items.indexOf(item);
		if (index < 0) throw new Error('inputOf needs an input item of this run');
		return call(() => inputOf(witInputOf(index)));
	},
});

const binary = {
	create: async () => {
		throw new Error('The sandbox has no binary data yet');
	},
};

type Output =
	| { tag: 'item'; val: string }
	| { tag: 'passed'; val: number }
	| { tag: 'made'; val: [string, number[]] };

interface RoutedOutput {
	to?: string;
	output: Output;
}

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
	isRecord(value) && Symbol.asyncIterator in value;

const isIterable = (value: unknown): value is Iterable<unknown> =>
	typeof value === 'object' && value !== null && Symbol.iterator in value;

/** The raw outputs of one run, as `run()` or a binding gives them. */
async function* valuesOf(
	action: Action,
	input: Record<string, unknown>,
	items: readonly InputItem[],
	inputs: Readonly<Record<string, readonly InputItem[]>> | undefined,
): AsyncGenerator<unknown> {
	const context = { input, http, log, limits: witLimits(), binary, ...importsOf(items) };
	const batch = action.flow.cardinality === 'batch';
	const result = action.request
		? http.request(requestOf(action.request, input))
		: action.list
			? listItems(http, action.list, input)
			: inputs
				? action.run?.(withNoCredential({ ...context, inputs }))
				: batch
					? action.run?.(withNoCredential({ ...context, items }))
					: action.run?.(withNoCredential({ ...context, item: items[0] ?? { json: {} } }));
	if (action.flow.cardinality === 'per-item' && !isAsyncIterable(result)) {
		yield await result;
		return;
	}
	if (isAsyncIterable(result) || isIterable(result)) {
		yield* result;
		return;
	}
	throw new Error(
		`${action.id} is ${action.flow.cardinality}, so run() must give its outputs as a list or yield them`,
	);
}

const toOf = (value: Record<string, unknown>) =>
	value.to === undefined
		? {}
		: { to: typeof value.to === 'string' ? value.to : JSON.stringify(value.to) };

/** One raw output as the WIT output. `indexOf` finds an input item by identity. */
function routedOf(
	action: Action,
	value: unknown,
	indexOf: (item: unknown) => number,
): RoutedOutput {
	const passesOnly = action.output.json['x-n8n-passed'] === true;
	const batch = action.flow.cardinality === 'batch';
	if ((action.outputs === undefined && !batch && !passesOnly) || !isRecord(value)) {
		return { output: { tag: 'item', val: JSON.stringify(value) } };
	}
	if (value.item !== undefined) {
		return { ...toOf(value), output: { tag: 'passed', val: indexOf(value.item) } };
	}
	const json = JSON.stringify(value.json);
	if (!batch) return { ...toOf(value), output: { tag: 'item', val: json } };
	const from = Array.isArray(value.from) ? value.from.map(indexOf) : [indexOf(value.from)];
	return { ...toOf(value), output: { tag: 'made', val: [json, from] } };
}

/** The run error of the action world: the message, and the response of a failed request. */
function runErrorOf(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	if (!isHttpError(error)) return { message };
	return {
		message,
		response: {
			message,
			status: error.status,
			headers: Object.entries(error.headers),
			body: JSON.stringify(error.body ?? null),
		},
	};
}

/** The error of a WIT `result` export: ComponentizeJS sends its own `payload`. */
class ResultError extends Error {
	constructor(readonly payload: unknown) {
		super('The run failed');
	}
}

/** `next` of a WIT run: the next output, or `undefined` at the end. */
async function nextOf<T>(outputs: AsyncIterator<T>): Promise<T | undefined> {
	try {
		const { value, done } = await outputs.next();
		return done ? undefined : value;
	} catch (error) {
		throw new ResultError(runErrorOf(error));
	}
}

async function* routed(
	input: string,
	jsons: readonly string[],
): AsyncGenerator<RoutedOutput, void, undefined> {
	const action = actionOf();
	const items = jsons.map(
		(json): InputItem => Object.freeze({ json: Object.freeze(parsed(json)) }),
	);
	const indexOf = (item: unknown) => items.findIndex((entry) => entry === item);
	for await (const value of valuesOf(action, inputOf(input), items, undefined)) {
		yield routedOf(action, value, indexOf);
	}
}

/** `action.item-run`: a run starts at the first `next`, so its errors reach the host. */
class ItemRun {
	private readonly outputs: AsyncGenerator<RoutedOutput, void, undefined>;

	constructor(input: string, items: string[]) {
		this.outputs = routed(input, items);
	}

	async next() {
		return await nextOf(this.outputs);
	}
}

type JoinOutput =
	| { tag: 'passed'; val: { input: number; item: number } }
	| { tag: 'made'; val: [string, Array<{ input: number; item: number }>] };

async function* joined(
	input: string,
	lists: readonly string[][],
): AsyncGenerator<{ to?: string; output: JoinOutput }, void, undefined> {
	const action = actionOf();
	const names = action.inputs ?? [];
	const items = lists.map((list) =>
		list.map((json): InputItem => Object.freeze({ json: Object.freeze(parsed(json)) })),
	);
	const refOf = (item: unknown) => {
		const input = items.findIndex((list) => list.some((entry) => entry === item));
		return {
			input,
			item: input < 0 ? -1 : (items[input]?.findIndex((entry) => entry === item) ?? -1),
		};
	};
	const inputs = Object.fromEntries(names.map((name, index) => [name, items[index] ?? []]));
	for await (const value of valuesOf(action, inputOf(input), items[0] ?? [], inputs)) {
		if (!isRecord(value)) throw new Error(`${action.id} gave an output that is not an object`);
		if (value.item !== undefined) {
			yield { ...toOf(value), output: { tag: 'passed', val: refOf(value.item) } };
		} else {
			const from = Array.isArray(value.from) ? value.from.map(refOf) : [refOf(value.from)];
			yield { ...toOf(value), output: { tag: 'made', val: [JSON.stringify(value.json), from] } };
		}
	}
}

/** `action.join-run`: the run of an action with named inputs. */
class JoinRun {
	private readonly outputs: AsyncGenerator<{ to?: string; output: JoinOutput }, void, undefined>;

	constructor(input: string, inputs: string[][]) {
		this.outputs = joined(input, inputs);
	}

	async next() {
		return await nextOf(this.outputs);
	}
}

/** `action.run` of Node Contract 2.0.0. Every bundle of this SDK targets 2.1.0 or newer. */
class Run {
	async next(): Promise<string | undefined> {
		return await Promise.reject(
			new ResultError(runErrorOf(new Error('The sandbox runs Node Contract 2.1.0 or newer'))),
		);
	}
}

const describe = () =>
	JSON.stringify(actionOf(), (_key, value: unknown) =>
		typeof value === 'function' ? undefined : value,
	);

export const action = { describe, Run, ItemRun, JoinRun };
