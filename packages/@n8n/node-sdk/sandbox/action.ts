// The generic JS guest of the action interface: it runs an action bundle and gives it the run
// context over the imports of the action world.
import * as witBinary from 'n8n:node-contract/binary@2.5.0';
import { run as witCode } from 'n8n:node-contract/code@2.5.0';
import * as witTables from 'n8n:node-contract/data-tables@2.5.0';
import { get as witInputOf } from 'n8n:node-contract/input-of@2.5.0';
import { get as witLimits } from 'n8n:node-contract/limits@2.5.0';
import { open as witSupplied } from 'n8n:node-contract/supplied@2.5.0';
import { until as witUntil } from 'n8n:node-contract/wait@2.5.0';

import type {
	Action,
	Binaries,
	DataTable,
	DataTableFilter,
	DataTables,
	HostImports,
	Http,
	HttpRequest,
	InputItem,
} from '../src/define';
import { isDataTableRows } from '../src/host-imports';
import { listItems, requestOf, withBinaries } from '../src/runtime';
import type { Binary } from '../src/schema';
import { providerInputsOf, type ChatMessage, type ChatRequest } from '../src/providers';
import {
	actionOf,
	call,
	describe,
	httpCall,
	inputOf,
	isRecord,
	jsonRequest,
	log,
	messageOf,
	parsed,
	replyOf,
	responseOf,
	ResultError,
	runErrorOf,
	schemaOf,
	withCredential,
	witChatRequestOf,
	witMessageOf,
	witRequestOf,
} from './guest';

// A chunk crosses the boundary as one JSON-RPC message, so it stays far below the message limit.
const CHUNK_BYTES = 1 << 20;

/** The handles that `run()` holds, and the WIT binary of each. */
const resources = new WeakMap<object, witBinary.Binary>();

const resourceOf = (value: unknown) =>
	typeof value === 'object' && value !== null ? resources.get(value) : undefined;

function handleOf(resource: witBinary.Binary): Binary {
	const { mimeType, fileName, bytes } = resource.meta();
	const handle: Binary = Object.freeze({
		meta: Object.freeze({
			mimeType,
			...(fileName === undefined ? {} : { fileName }),
			...(bytes === undefined ? {} : { bytes: Number(bytes) }),
		}),
		async *read() {
			const reader = resource.reader();
			for (;;) {
				const chunk = call(() => reader.read(CHUNK_BYTES));
				if (chunk.length === 0) return;
				yield chunk;
			}
		},
	});
	resources.set(handle, resource);
	return handle;
}

const encoder = new TextEncoder();

const binary: Binaries = {
	create: async (meta, chunks) => {
		const writer = new witBinary.BinaryWriter(meta.mimeType, meta.fileName);
		for await (const chunk of chunks) {
			const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
			Array.from({ length: Math.ceil(bytes.length / CHUNK_BYTES) }, (_, index) =>
				bytes.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES),
			).forEach((piece) => call(() => writer.write(piece)));
		}
		return handleOf(call(() => witBinary.BinaryWriter.finish(writer)));
	},
};

function request(
	options: HttpRequest & { readonly response: 'binary'; readonly fullResponse?: false },
): Promise<Binary>;
function request(options: HttpRequest): Promise<unknown>;
async function request(options: HttpRequest): Promise<unknown> {
	const body = resourceOf(options.body);
	if (options.response === 'binary') {
		const response = httpCall(() =>
			witBinary.fetch(
				{
					...witRequestOf(options),
					...(body === undefined && options.body !== undefined
						? { body: JSON.stringify(options.body) }
						: {}),
				},
				body,
			),
		);
		return responseOf(response, handleOf(response.body), options.fullResponse);
	}
	if (body === undefined) return jsonRequest(options);
	const response = httpCall(() => witBinary.send(witRequestOf(options), body));
	return responseOf(response, parsed(response.body), options.fullResponse);
}

const http: Http = { request };

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

/** The capability of a provider, at `{ "$capability": id }` of the run input. */
function capabilityOf(ref: unknown): unknown {
	if (!isRecord(ref) || typeof ref.$capability !== 'number') {
		throw new Error('The host gave a provider field without a capability');
	}
	const id = BigInt(ref.$capability);
	const capability = call(() => witSupplied(id));
	switch (capability.tag) {
		case 'chat-model': {
			const model = capability.val;
			return {
				model: model.model(),
				chat: async (chatRequest: ChatRequest) =>
					replyOf(call(() => model.chat(witChatRequestOf(chatRequest)))),
			};
		}
		case 'memory': {
			const memory = capability.val;
			return {
				load: async () => call(() => memory.load()).map(messageOf),
				save: async (messages: readonly ChatMessage[]) =>
					call(() => memory.save(messages.map(witMessageOf))),
			};
		}
		case 'tool': {
			const tool = capability.val;
			return {
				name: tool.name(),
				description: tool.description(),
				input: schemaOf(tool.input()),
				call: async (args: unknown) => parsed(call(() => tool.call(JSON.stringify(args)))),
			};
		}
		case 'embeddings': {
			const embeddings = capability.val;
			return {
				embed: async (texts: readonly string[]) =>
					call(() => embeddings.embed([...texts])).map((vector) => Array.from(vector)),
			};
		}
	}
}

/** The run input with the binary handles and the capabilities that `run()` reads. */
async function runInputOf(action: Action, text: string): Promise<Record<string, unknown>> {
	const withFiles = await withBinaries(inputOf(text), action.inputSchema, async (ref) => {
		if (!isRecord(ref) || typeof ref.$binary !== 'number') {
			throw new Error('The host gave a binary field without a binary');
		}
		const id = BigInt(ref.$binary);
		return handleOf(call(() => witBinary.open(id)));
	});
	if (!isRecord(withFiles)) throw new Error('The run input is not an object');
	const supplies = providerInputsOf(action.input).flatMap(({ name, many }) => {
		const value = withFiles[name];
		if (value === undefined) return [];
		return [[name, many && Array.isArray(value) ? value.map(capabilityOf) : capabilityOf(value)]];
	});
	return { ...withFiles, ...Object.fromEntries(supplies) };
}

/** JSON of an output: each binary handle becomes `{ "$binary": id }`. */
const jsonOf = (value: unknown) =>
	JSON.stringify(value, (_key, entry: unknown) => {
		const resource = resourceOf(entry);
		return resource ? { $binary: Number(resource.id()) } : entry;
	});

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
	// The WIT has no warning, so the drift of a page goes to the log, once per run.
	const warned = new Set<string>();
	const drift = (issues: readonly string[]) => {
		const message = `The response of ${action.id} does not match its contract, so check the fields: ${issues.join('; ')}`;
		if (!warned.has(message)) log('warn', message);
		warned.add(message);
	};
	const result = action.request
		? http.request(requestOf(action.request, input))
		: action.list
			? listItems(http, action.list, input, drift)
			: inputs
				? action.run?.(withCredential({ ...context, inputs }))
				: batch
					? action.run?.(withCredential({ ...context, items }))
					: action.run?.(withCredential({ ...context, item: items[0] ?? { json: {} } }));
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
		return { output: { tag: 'item', val: jsonOf(value) } };
	}
	if (value.item !== undefined) {
		return { ...toOf(value), output: { tag: 'passed', val: indexOf(value.item) } };
	}
	const json = jsonOf(value.json);
	if (!batch) return { ...toOf(value), output: { tag: 'item', val: json } };
	const from = Array.isArray(value.from) ? value.from.map(indexOf) : [indexOf(value.from)];
	return { ...toOf(value), output: { tag: 'made', val: [json, from] } };
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
	for await (const value of valuesOf(action, await runInputOf(action, input), items, undefined)) {
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
		const index = items.findIndex((list) => list.some((entry) => entry === item));
		return {
			input: index,
			item: index < 0 ? -1 : (items[index]?.findIndex((entry) => entry === item) ?? -1),
		};
	};
	const inputs = Object.fromEntries(names.map((name, index) => [name, items[index] ?? []]));
	const runInput = await runInputOf(action, input);
	for await (const value of valuesOf(action, runInput, items[0] ?? [], inputs)) {
		if (!isRecord(value)) throw new Error(`${action.id} gave an output that is not an object`);
		if (value.item !== undefined) {
			yield { ...toOf(value), output: { tag: 'passed', val: refOf(value.item) } };
		} else {
			const from = Array.isArray(value.from) ? value.from.map(refOf) : [refOf(value.from)];
			yield { ...toOf(value), output: { tag: 'made', val: [jsonOf(value.json), from] } };
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

export const action = { describe, Run, ItemRun, JoinRun };
