// The WIT imports of the JS guest in Node, in the form that ComponentizeJS gives them (see
// `../wit.d.ts`). Each call sends a JSON-RPC request to the host and blocks for its answer, so
// the guest code calls them synchronously as in the WASM component.
import type { SyncTransport } from './transport';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const get = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const numberOf = (value: unknown) => (typeof value === 'number' ? value : Number.NaN);
const text = (value: unknown) => JSON.stringify(value ?? null);
const parsed = (value: unknown): unknown =>
	typeof value === 'string' ? JSON.parse(value) : undefined;
export const camel = (name: string) =>
	name.replace(/-(\w)/g, (_, char: string) => char.toUpperCase());
const kebab = (name: string) => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

interface Guest {
	transport: SyncTransport;
	grants: ReadonlySet<string>;
	calls: number;
	/** The error that stopped the guest, as a trap stops the WASM component. */
	stopped?: string;
}

const guests = new Map<'guest', Guest>();

export function connect(transport: SyncTransport, grants: readonly string[]) {
	guests.set('guest', { transport, grants: new Set(grants), calls: 0 });
}

export const stoppedMessage = () => guests.get('guest')?.stopped;

function guestOf(): Guest {
	const guest = guests.get('guest');
	if (!guest) throw new Error('The guest has no host connection');
	if (guest.stopped !== undefined) throw new Error(guest.stopped);
	return guest;
}

function stop(guest: Guest, message: string): never {
	guest.stopped = message;
	throw new Error(message);
}

function granted(method: string): Guest {
	const guest = guestOf();
	const [name = ''] = method.split('.');
	if (!guest.grants.has(name)) {
		stop(guest, `The bundle called ${method}, which its manifest does not grant`);
	}
	return guest;
}

const send = (guest: Guest, message: Record<string, unknown>) =>
	guest.transport.send(JSON.stringify({ jsonrpc: '2.0', ...message }));

/**
 * A call to the host. `failure` gives the payload of a WIT `result` error, as ComponentizeJS
 * throws it. Another error stops the guest, as the sidecar traps.
 */
function call(
	method: string,
	params: Record<string, unknown>,
	failure?: (data: unknown) => unknown,
): unknown {
	const guest = granted(method);
	guest.calls += 1;
	const id = `g${guest.calls}`;
	send(guest, { id, method, params });
	const line = guest.transport.receive();
	if (line === undefined) return stop(guest, 'the host closed the connection');
	const reply: unknown = JSON.parse(line);
	if (get(reply, 'id') !== id) {
		return stop(guest, `the host sent another message while the guest waited for ${method}`);
	}
	const error = get(reply, 'error');
	if (error === undefined) return get(reply, 'result') ?? null;
	const text = get(error, 'message');
	const message = typeof text === 'string' ? text : 'no message';
	if (failure && get(error, 'code') === -32000) {
		throw Object.assign(new Error(message), { payload: failure(get(error, 'data')) });
	}
	return stop(guest, `The host refused ${method}: ${message}`);
}

const notify = (method: string, params: Record<string, unknown>) =>
	send(granted(method), { method, params });

const asText = (data: unknown) => String(data);

// ── http and errors ─────────────────────────────────────────────────────────────────────

interface JcoRequest {
	body?: string;
	[key: string]: unknown;
}

const requestOut = ({ body, ...request }: JcoRequest) => ({
	...request,
	...(body === undefined ? {} : { body: JSON.parse(body) }),
});

const responseIn = (response: unknown) => ({
	status: numberOf(get(response, 'status')),
	headers: list(get(response, 'headers')),
	body: text(get(response, 'body')),
});

const httpErrorIn = (error: unknown) => ({
	message: String(get(error, 'message')),
	...responseIn(error),
});

const httpFailureIn = (data: unknown) =>
	get(data, 'tag') === 'response'
		? { tag: 'response', val: httpErrorIn(get(data, 'val')) }
		: { tag: 'transport', val: String(get(data, 'val')) };

const runErrorIn = (data: unknown) => {
	const response = get(data, 'response');
	return {
		message: String(get(data, 'message')),
		...(response === undefined || response === null ? {} : { response: httpErrorIn(response) }),
	};
};

const http = {
	request: (request: JcoRequest) =>
		responseIn(call('http.request', { request: requestOut(request) }, httpFailureIn)),
};

const log = {
	log: (level: string, message: string) => notify('log.log', { level, message }),
};

const limits = { get: () => call('limits.get', {}) };

const chunk = { item: (index: number) => notify('chunk.item', { index }) };

const runCredential = {
	get: () => {
		const credential = call('run-credential.get', {}, asText);
		return credential === null
			? undefined
			: { type: String(get(credential, 'type')), fields: text(get(credential, 'fields')) };
	},
};

// ── binary ──────────────────────────────────────────────────────────────────────────────

const bytesIn = (data: unknown) => Buffer.from(String(data), 'base64');

class BinaryReader {
	constructor(private readonly self: unknown) {}

	read(maxBytes: number) {
		return bytesIn(call('binary.binary-reader.read', { self: this.self, maxBytes }, asText));
	}
}

class Binary {
	constructor(readonly self: unknown) {}

	meta() {
		const meta = call('binary.binary.meta', { self: this.self });
		const bytes = get(meta, 'bytes');
		return {
			mimeType: String(get(meta, 'mimeType')),
			fileName: get(meta, 'fileName'),
			bytes: typeof bytes === 'number' ? BigInt(bytes) : undefined,
		};
	}

	reader() {
		return new BinaryReader(call('binary.binary.reader', { self: this.self }));
	}

	id() {
		return BigInt(numberOf(call('binary.binary.id', { self: this.self })));
	}
}

class BinaryWriter {
	private readonly self: unknown;

	constructor(mimeType: string, fileName?: string) {
		this.self = call('binary.binary-writer.[new]', { mimeType, fileName });
	}

	write(chunk: Uint8Array) {
		call(
			'binary.binary-writer.write',
			{ self: this.self, chunk: Buffer.from(chunk).toString('base64') },
			asText,
		);
	}

	static finish(writer: BinaryWriter) {
		return new Binary(call('binary.binary-writer.finish', { writer: writer.self }, asText));
	}
}

const binary = {
	Binary,
	BinaryReader,
	BinaryWriter,
	open: (id: bigint) => new Binary(call('binary.open', { id: Number(id) }, asText)),
	send: (request: JcoRequest, body: Binary) =>
		responseIn(call('binary.send', { request, body: body.self }, httpFailureIn)),
	fetch: (request: JcoRequest, body?: Binary) => {
		const response = call(
			'binary.fetch',
			{ request: requestOut(request), body: body?.self },
			httpFailureIn,
		);
		return {
			status: numberOf(get(response, 'status')),
			headers: list(get(response, 'headers')),
			body: new Binary(get(response, 'body')),
		};
	},
};

// ── data-tables ─────────────────────────────────────────────────────────────────────────

interface JcoFilter {
	match: string;
	conditions: Array<{ column: string; op: string; value?: string }>;
}

const filterOut = ({ match, conditions }: JcoFilter) => ({
	match,
	conditions: conditions.map(({ column, op, value }) => ({
		column,
		op: camel(op),
		...(value === undefined ? {} : { value: JSON.parse(value) }),
	})),
});

const rowsIn = (rows: unknown) => list(rows).map(text);

class Table {
	constructor(private readonly self: unknown) {}

	private call(name: string, params: Record<string, unknown> = {}) {
		return call(`data-tables.table.${name}`, { self: this.self, ...params }, asText);
	}

	id() {
		return String(call('data-tables.table.id', { self: this.self }));
	}

	columns() {
		return this.call('columns');
	}

	rows({ filter, ...query }: { filter?: JcoFilter; [key: string]: unknown }) {
		const page = this.call('rows', {
			query: { ...query, ...(filter ? { filter: filterOut(filter) } : {}) },
		});
		return { count: BigInt(numberOf(get(page, 'count'))), rows: rowsIn(get(page, 'rows')) };
	}

	insert(rows: string[]) {
		return rowsIn(this.call('insert', { rows: rows.map((row) => JSON.parse(row)) }));
	}

	update(filter: JcoFilter, values: string) {
		return rowsIn(this.call('update', { filter: filterOut(filter), values: JSON.parse(values) }));
	}

	upsert(filter: JcoFilter, values: string) {
		return rowsIn(this.call('upsert', { filter: filterOut(filter), values: JSON.parse(values) }));
	}

	delete(filter: JcoFilter) {
		return rowsIn(this.call('delete', { filter: filterOut(filter) }));
	}

	clear() {
		return BigInt(numberOf(this.call('clear')));
	}

	rename(name: string) {
		return this.call('rename', { name });
	}

	drop() {
		return this.call('drop');
	}
}

const dataTables = {
	Table,
	open: (table: unknown) => new Table(call('data-tables.open', { table }, asText)),
	list: ({ sort, ...query }: { sort?: { by: string; direction: string } }) => {
		const page = call(
			'data-tables.list',
			{ query: { ...query, ...(sort ? { sort: { ...sort, by: camel(sort.by) } } : {}) } },
			asText,
		);
		return { count: BigInt(numberOf(get(page, 'count'))), tables: list(get(page, 'tables')) };
	},
	create: (table: unknown) => call('data-tables.create', { table }, asText),
};

const parsers = {
	extract: (file: Binary, request: { tag: string; val: Record<string, unknown> }) =>
		text(call('parsers.extract', { file: file.self, request }, asText)),
};

const code = {
	run: (request: unknown) => text(call('code.run', { request }, asText)),
};

const wait = {
	until: (at: bigint) => {
		call('wait.until', { at: Number(at) }, asText);
	},
};

const inputOf = {
	get: (item: number) => text(call('input-of.get', { item }, asText)),
};

// ── capabilities ────────────────────────────────────────────────────────────────────────

export interface JcoToolCall {
	id: string;
	name: string;
	args: string;
}

export interface JcoMessage {
	tag: string;
	val: unknown;
}

export const toolCallOut = ({ args, ...toolCall }: JcoToolCall) => ({
	...toolCall,
	args: parsed(args),
});

export const toolCallIn = (toolCall: unknown) => ({
	id: String(get(toolCall, 'id')),
	name: String(get(toolCall, 'name')),
	args: text(get(toolCall, 'args')),
});

export const messageOut = ({ tag, val }: JcoMessage) => {
	const toolCalls = get(val, 'toolCalls');
	if (tag !== 'assistant' || !Array.isArray(toolCalls)) return { tag, val };
	return { tag, val: { ...(isRecord(val) ? val : {}), toolCalls: toolCalls.map(toolCallOut) } };
};

export const messageIn = (message: unknown) => {
	const tag = String(get(message, 'tag'));
	const val = get(message, 'val');
	const toolCalls = get(val, 'toolCalls');
	if (tag !== 'assistant' || !Array.isArray(toolCalls)) return { tag, val };
	return { tag, val: { ...(isRecord(val) ? val : {}), toolCalls: toolCalls.map(toolCallIn) } };
};

interface JcoChatRequest {
	messages: JcoMessage[];
	tools?: Array<{ name: string; description: string; input: string }>;
	output?: string;
}

const chatRequestOut = ({ messages, tools, output }: JcoChatRequest) => ({
	messages: messages.map(messageOut),
	...(tools ? { tools: tools.map((tool) => ({ ...tool, input: parsed(tool.input) })) } : {}),
	...(output === undefined ? {} : { output: parsed(output) }),
});

class ChatModel {
	constructor(private readonly self: unknown) {}

	model() {
		return String(call('capabilities.chat-model.model', { self: this.self }));
	}

	chat(request: JcoChatRequest) {
		const reply = call(
			'capabilities.chat-model.chat',
			{ self: this.self, request: chatRequestOut(request) },
			runErrorIn,
		);
		const usage = get(reply, 'usage');
		return {
			text: String(get(reply, 'text')),
			toolCalls: list(get(reply, 'toolCalls')).map(toolCallIn),
			finishReason: String(get(reply, 'finishReason')),
			usage: usage === null ? undefined : usage,
		};
	}
}

class Memory {
	constructor(private readonly self: unknown) {}

	load() {
		return list(call('capabilities.memory.load', { self: this.self }, runErrorIn)).map(messageIn);
	}

	save(messages: JcoMessage[]) {
		call(
			'capabilities.memory.save',
			{ self: this.self, messages: messages.map(messageOut) },
			runErrorIn,
		);
	}
}

class Tool {
	constructor(private readonly self: unknown) {}

	name() {
		return String(call('capabilities.tool.name', { self: this.self }));
	}

	description() {
		return String(call('capabilities.tool.description', { self: this.self }));
	}

	input() {
		return text(call('capabilities.tool.input', { self: this.self }));
	}

	call(args: string) {
		return text(
			call('capabilities.tool.call', { self: this.self, args: parsed(args) }, runErrorIn),
		);
	}
}

class Embeddings {
	constructor(private readonly self: unknown) {}

	embed(texts: string[]) {
		return list(call('capabilities.embeddings.embed', { self: this.self, texts }, runErrorIn)).map(
			(vector) => Float64Array.from(list(vector).map(numberOf)),
		);
	}
}

const CAPABILITIES: Readonly<Record<string, new (self: unknown) => object>> = {
	chatModel: ChatModel,
	memory: Memory,
	tool: Tool,
	embeddings: Embeddings,
};

const supplied = {
	open: (id: bigint) => {
		const capability = call('supplied.open', { id: Number(id) }, asText);
		const tag = String(get(capability, 'tag'));
		const Capability = CAPABILITIES[tag];
		if (!Capability) return stop(guestOf(), `The host gave the capability ${tag}`);
		return { tag: kebab(tag), val: new Capability(get(capability, 'val')) };
	},
};

const sources = new Map<'source', string>();

export const setSource = (source: string) => sources.set('source', source);

const bundle = { source: () => sources.get('source') ?? '' };

/** The modules by WIT interface name, without the package and the version. */
export const modules: Readonly<Record<string, object>> = {
	bundle,
	http,
	log,
	limits,
	chunk,
	'run-credential': runCredential,
	binary,
	'data-tables': dataTables,
	parsers,
	code,
	wait,
	'input-of': inputOf,
	capabilities: { ChatModel, Memory, Tool, Embeddings },
	supplied,
};
