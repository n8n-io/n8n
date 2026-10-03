import { spawn } from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { toHostname, UnexpectedError, UserError } from 'n8n-workflow';

import type { AnyCredentialType } from './credentials';
import {
	isHttpError,
	type Action,
	type Binaries,
	type DataTable,
	type DataTableColumnType,
	type DataTableCondition,
	type DataTableFilter,
	type HostImport,
	type HostImports,
	type Http,
	type HttpError,
	type HttpMethod,
	type HttpRequest,
	type InputItem,
	isRequestPath,
	type LogLevel,
	type NodeDefinition,
	type RunLimits,
} from './define';
import { allowsHost, permissionsOf } from './egress';
import {
	executorOf,
	loadExecutor,
	verifiedCodeOf,
	withBinaries,
	type Executor,
	type ExecutorLoader,
	type FrozenVersion,
} from './runtime';
import { Schema, type Binary, type JsonSchema, type Shape } from './schema';
import {
	provider,
	providedKindOf,
	providerInputsOf,
	type ChatMessage,
	type ChatReply,
	type ChatRequest,
	type ChatUsage,
	type ProviderCapabilities,
	type ProviderKind,
	type ToolCall,
	type ToolDefinition,
} from './providers';
import { NODE_CONTRACT_VERSION, type VersionManifest } from './version';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The limits of one node execution in the sandbox. The executor enforces requests and items. */
export interface SandboxLimits {
	/**
	 * Guest memory in MiB.
	 *
	 * @defaultValue `256`
	 */
	readonly memoryMb: number;
	/**
	 * Guest CPU time in milliseconds. Time in host calls, e.g. HTTP requests, does not count.
	 *
	 * @defaultValue `30000`
	 */
	readonly cpuMs: number;
	/**
	 * Wall clock in milliseconds, host calls included. Then the host stops the sidecar.
	 *
	 * @defaultValue `600000`
	 */
	readonly wallMs: number;
	/**
	 * The largest message from the sidecar in bytes, e.g. one batch of output items.
	 *
	 * @defaultValue `67108864` (64 MiB)
	 */
	readonly maxMessageBytes: number;
}

/**
 * Where the sandbox finds its sidecar, guests and cache, and its limits.
 *
 * @see `docs/sandboxed-execution.md`
 */
export interface SandboxOptions {
	/** The `n8n-sandbox` binary. */
	readonly sidecar: string;
	/** The directory of the generic JS guest components: `action.wasm` and `provider.wasm`. */
	readonly guests: string;
	/**
	 * A directory that only n8n can write. It holds the compiled guest and the verified bundles,
	 * and the sidecar loads native code from it.
	 */
	readonly cacheDir: string;
	/**
	 * The credential type of a name from the registry of the host. The hosts and the base URL of a
	 * credential come from here, never from the bundle.
	 */
	readonly credentialType: (name: string) => AnyCredentialType | undefined;
	/** Limits that replace the defaults of `SandboxLimits`. */
	readonly limits?: Partial<SandboxLimits>;
}

const DEFAULT_LIMITS: SandboxLimits = {
	memoryMb: 256,
	cpuMs: 30_000,
	wallMs: 600_000,
	maxMessageBytes: 64 * 1024 * 1024,
};

const SPEC_WIT = path.resolve(__dirname, '..', 'spec', 'wit');

/** Outputs per `[take]`: the guest runs ahead of the host by at most this many. */
const TAKE = 100;

const STDERR_KEPT = 4_000;

/** A JSON-RPC error that the host gives the guest, see `spec/json-rpc.md`. */
class RpcError extends Error {
	constructor(
		readonly code: number,
		message: string,
		readonly data?: unknown,
	) {
		super(message);
	}
}

/** A failed `result` of a WIT import: −32000 with the error value as `data`. */
const resultError = (message: string, data: unknown = message) =>
	new RpcError(-32000, message, data);

type GuestCalls = (method: string, params: Record<string, unknown>) => Promise<unknown>;

interface Connection {
	request(method: string, params: Record<string, unknown>): Promise<unknown>;
	notify(method: string, params: Record<string, unknown>): void;
	/** The guest calls go to `calls` until the returned function runs. */
	serve(calls: GuestCalls): () => boolean;
	close(): void;
}

/** The kinds whose interface the sandbox runs, each with its own guest component. */
type SandboxKind = 'action' | 'provider';

interface SessionConfig {
	readonly options: SandboxOptions;
	readonly kind: SandboxKind;
	readonly guest: string;
	readonly guestSha256: string;
	readonly limits: SandboxLimits;
	readonly manifest: VersionManifest;
	readonly bundleFile: string;
	readonly grants: readonly string[];
}

const IMPORT_INTERFACES: Readonly<Record<HostImport, string>> = {
	dataTables: 'data-tables',
	code: 'code',
	wait: 'wait',
	inputOf: 'input-of',
};

/** The imports of the world that the manifest grants. A provider gets only the base imports. */
const grantsOf = ({ kind, contract }: VersionManifest) => {
	const { imports, binary, supplied } = permissionsOf(contract);
	return [
		'http',
		'log',
		'limits',
		'run-credential',
		...(kind === 'provider'
			? []
			: [
					...imports.map((name) => IMPORT_INTERFACES[name]),
					...(binary ? ['binary'] : []),
					...(supplied.length ? ['supplied', 'capabilities'] : []),
				]),
	];
};

/** One sidecar process: one component instance, so one node execution shares no state with another. */
function connect(config: SessionConfig): Connection {
	const { options, limits, manifest, bundleFile, grants } = config;
	const child = spawn(
		options.sidecar,
		[
			...['--wit', SPEC_WIT, '--world', `${config.kind}-bundle`, '--component', config.guest],
			...['--component-sha256', config.guestSha256],
			...grants.flatMap((grant) => ['--grant', grant]),
			...['--bundle', bundleFile, '--bundle-sha256', manifest.bundleHash],
			...['--node-contract', manifest.nodeContract, '--cache', options.cacheDir],
			...['--memory-mb', String(limits.memoryMb), '--cpu-ms', String(limits.cpuMs)],
		],
		{ stdio: ['pipe', 'pipe', 'pipe'], env: {}, windowsHide: true },
	);
	const pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();
	const state = { next: 1, partialLength: 0, stderr: '' };
	// The chunks of an incomplete line, so a long line is joined once.
	const partial: string[] = [];
	const served = new Map<'calls', GuestCalls>();
	const failure = new Map<'error', Error>();
	const fail = (error: Error) => {
		if (!failure.has('error')) failure.set('error', error);
		pending.forEach(({ reject }) => reject(error));
		pending.clear();
		child.kill('SIGKILL');
	};
	const timer = setTimeout(
		() => fail(new UserError(`${manifest.id} ran longer than ${limits.wallMs} ms and was stopped`)),
		limits.wallMs,
	);
	const send = (message: Record<string, unknown>) => {
		// An answer can come after the sidecar stopped, e.g. at the wall clock limit.
		if (failure.has('error')) return;
		child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
	};
	const answer = async (id: unknown, method: string, params: Record<string, unknown>) => {
		const calls = served.get('calls');
		try {
			if (!calls) throw new RpcError(-32601, `${method} has no run`);
			const result = await calls(method, params);
			if (id !== undefined) send({ id, result: result ?? null });
		} catch (error) {
			if (id === undefined) return;
			const rpc =
				error instanceof RpcError
					? error
					: new RpcError(-32603, error instanceof Error ? error.message : String(error));
			send({ id, error: { code: rpc.code, message: rpc.message, data: rpc.data } });
		}
	};
	const receive = (line: string) => {
		const message: unknown = JSON.parse(line);
		if (!isRecord(message))
			throw new UnexpectedError('The sandbox sent a message that is not an object');
		if (typeof message.method === 'string') {
			void answer(message.id, message.method, isRecord(message.params) ? message.params : {});
			return;
		}
		const waiting = typeof message.id === 'number' ? pending.get(message.id) : undefined;
		if (!waiting || typeof message.id !== 'number') return;
		pending.delete(message.id);
		if (isRecord(message.error)) {
			const text = typeof message.error.message === 'string' ? message.error.message : 'error';
			waiting.reject(
				Object.assign(new UserError(text), { code: message.error.code, data: message.error.data }),
			);
		} else {
			waiting.resolve(message.result);
		}
	};
	child.stdout.setEncoding('utf8');
	child.stdout.on('data', (chunk: string) => {
		const [head = '', ...rest] = chunk.split('\n');
		const tail = rest.pop();
		const lines = tail === undefined ? [] : [[...partial, head].join(''), ...rest].filter(Boolean);
		if (tail !== undefined) {
			partial.length = 0;
			state.partialLength = 0;
		}
		const open = tail ?? head;
		partial.push(open);
		state.partialLength += open.length;
		if (state.partialLength > limits.maxMessageBytes) {
			fail(
				new UserError(`${manifest.id} gave a message larger than ${limits.maxMessageBytes} bytes`),
			);
			return;
		}
		try {
			lines.forEach(receive);
		} catch (error) {
			fail(error instanceof Error ? error : new UnexpectedError(String(error)));
		}
	});
	child.stdin.on('error', (error) =>
		fail(new UnexpectedError(`The sandbox connection failed: ${error.message}`)),
	);
	child.stderr.setEncoding('utf8');
	child.stderr.on('data', (chunk: string) => {
		state.stderr = `${state.stderr}${chunk}`.slice(-STDERR_KEPT);
	});
	child.on('error', (error) =>
		fail(new UnexpectedError(`The sandbox did not start: ${error.message}`)),
	);
	child.on('exit', (code, signal) => {
		clearTimeout(timer);
		fail(
			new UnexpectedError(
				`The sandbox stopped (${signal ?? `exit ${code}`})${state.stderr ? `: ${state.stderr.trim()}` : ''}`,
			),
		);
	});
	return {
		async request(method, params) {
			const known = failure.get('error');
			if (known) throw known;
			const id = state.next++;
			const result = new Promise<unknown>((resolve, reject) =>
				pending.set(id, { resolve, reject }),
			);
			send({ id, method, params });
			return await result;
		},
		notify(method, params) {
			send({ method, params });
		},
		serve(calls) {
			// The guest calls carry no run, so one connection runs one run at a time.
			if (served.has('calls')) throw new UnexpectedError(`${manifest.id} runs one run at a time`);
			served.set('calls', calls);
			return () => served.delete('calls');
		},
		close() {
			clearTimeout(timer);
			failure.set('error', failure.get('error') ?? new UnexpectedError('The sandbox is closed'));
			child.stdin.end();
			child.kill('SIGKILL');
		},
	};
}

async function openSession(config: SessionConfig): Promise<Connection> {
	const connection = connect(config);
	try {
		const started = await connection.request('[initialize]', {
			nodeContract: NODE_CONTRACT_VERSION,
		});
		if (!isRecord(started) || started.kind !== config.kind) {
			throw new UnexpectedError(
				`${config.manifest.id} is not a bundle of the ${config.kind} interface`,
			);
		}
		return connection;
	} catch (error) {
		connection.close();
		throw error;
	}
}

// ── Host imports: the answers to the guest calls of one run ─────────────────────────────

const HTTP_METHODS: ReadonlySet<string> = new Set([
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'HEAD',
]);
const isHttpMethod = (value: unknown): value is HttpMethod =>
	typeof value === 'string' && HTTP_METHODS.has(value);

const isPairs = (value: unknown): value is Array<[string, string]> =>
	Array.isArray(value) &&
	value.every(
		(pair) =>
			Array.isArray(pair) &&
			pair.length === 2 &&
			typeof pair[0] === 'string' &&
			typeof pair[1] === 'string',
	);

/** `id=a&id=b` arrives as two pairs and goes to the HTTP client as `{ id: ['a', 'b'] }`. */
const queryOf = (pairs: Array<[string, string]>) =>
	Object.fromEntries(
		[...new Set(pairs.map(([key]) => key))].map((key) => {
			const values = pairs.filter(([name]) => name === key).map(([, value]) => value);
			return [key, values.length === 1 ? (values[0] ?? '') : values];
		}),
	);

/**
 * The response headers that a guest can read: body format, file data, caching, redirects and
 * created URLs, pages, rate limits and request IDs. Other headers, for example `set-cookie` and
 * `www-authenticate`, can carry session or account data, so the host keeps them. A manifest cannot
 * add a header: the bundle author writes the manifest.
 */
const GUEST_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
	'content-type',
	'content-length',
	'content-disposition',
	'etag',
	'last-modified',
	'location',
	'link',
	'retry-after',
	'ratelimit',
	'request-id',
	'x-request-id',
]);

const isGuestResponseHeader = (name: string) =>
	GUEST_RESPONSE_HEADERS.has(name) ||
	name.startsWith('x-ratelimit-') ||
	name.startsWith('ratelimit-');

/** The response headers for the guest: lower-case names, allowed names only, one value each. */
const headerPairsOf = (headers: unknown): Array<[string, string]> =>
	Object.entries(isRecord(headers) ? headers : {}).flatMap(
		([key, value]): Array<[string, string]> => {
			const name = key.toLowerCase();
			if (!isGuestResponseHeader(name)) return [];
			return typeof value === 'string' || typeof value === 'number'
				? [[name, String(value)]]
				: Array.isArray(value)
					? [[name, value.map(String).join(', ')]]
					: [];
		},
	);

const isFullResponse = (
	value: unknown,
): value is { body: unknown; headers: unknown; statusCode: number } =>
	isRecord(value) && typeof value.statusCode === 'number' && 'body' in value;

const isTableField = (value: unknown): value is 'name' | 'createdAt' | 'updatedAt' =>
	value === 'name' || value === 'createdAt' || value === 'updatedAt';

const isColumnType = (value: unknown): value is DataTableColumnType =>
	value === 'string' || value === 'number' || value === 'boolean' || value === 'date';
const OPERATORS: ReadonlySet<string> = new Set([
	'eq',
	'neq',
	'like',
	'ilike',
	'gt',
	'gte',
	'lt',
	'lte',
	'isEmpty',
	'isNotEmpty',
]);

const isCell = (value: unknown) =>
	value === null || ['string', 'number', 'boolean'].includes(typeof value);

const isCondition = (value: unknown): value is DataTableCondition =>
	isRecord(value) &&
	typeof value.column === 'string' &&
	typeof value.op === 'string' &&
	OPERATORS.has(value.op) &&
	(value.op === 'isEmpty' || value.op === 'isNotEmpty' ? !('value' in value) : isCell(value.value));

const isFilter = (value: unknown): value is DataTableFilter =>
	isRecord(value) &&
	(value.match === 'all' || value.match === 'any') &&
	Array.isArray(value.conditions) &&
	value.conditions.every(isCondition);

const isValues = (value: unknown): value is Record<string, string | number | boolean | null> =>
	isRecord(value) && Object.values(value).every(isCell);

const isDirection = (value: unknown): value is 'asc' | 'desc' =>
	value === 'asc' || value === 'desc';

const optionalNumber = (value: unknown) =>
	value === undefined || (typeof value === 'number' && Number.isInteger(value));

/** Runs a data table call; a failure is the `string` error of the WIT `result`. */
async function tableResult<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		throw resultError(error instanceof Error ? error.message : String(error));
	}
}

const httpErrorOf = (error: HttpError, message: string) => ({
	message,
	status: error.status,
	headers: headerPairsOf(error.headers),
	body: error.body ?? null,
});

// ── The chat types of `capabilities` in their JSON-RPC form ─────────────────────────────

const isJsonSchema = (value: unknown): value is JsonSchema => isRecord(value);

const isToolCall = (value: unknown): value is ToolCall =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	typeof value.name === 'string' &&
	isRecord(value.args);

const isToolCalls = (value: unknown): value is ToolCall[] =>
	Array.isArray(value) && value.every(isToolCall);

const isToolDefinition = (value: unknown): value is ToolDefinition =>
	isRecord(value) &&
	typeof value.name === 'string' &&
	typeof value.description === 'string' &&
	isJsonSchema(value.input);

const isTokens = (value: unknown): value is ChatUsage =>
	isRecord(value) &&
	typeof value.inputTokens === 'number' &&
	typeof value.outputTokens === 'number';

function wireMessageOf(message: ChatMessage) {
	switch (message.role) {
		case 'system':
		case 'user':
			return { tag: message.role, val: message.content };
		case 'assistant':
			return {
				tag: 'assistant',
				val: {
					content: message.content,
					...(message.toolCalls ? { toolCalls: message.toolCalls } : {}),
				},
			};
		case 'tool':
			return {
				tag: 'tool',
				val: { toolCallId: message.toolCallId, name: message.name, content: message.content },
			};
	}
}

function messageOfWire(value: unknown): ChatMessage | undefined {
	if (!isRecord(value)) return undefined;
	const { tag, val } = value;
	if ((tag === 'system' || tag === 'user') && typeof val === 'string') {
		return { role: tag, content: val };
	}
	if (tag === 'assistant' && isRecord(val) && typeof val.content === 'string') {
		const { content, toolCalls } = val;
		if (toolCalls === undefined) return { role: 'assistant', content };
		return isToolCalls(toolCalls) ? { role: 'assistant', content, toolCalls } : undefined;
	}
	if (
		tag === 'tool' &&
		isRecord(val) &&
		typeof val.toolCallId === 'string' &&
		typeof val.name === 'string' &&
		typeof val.content === 'string'
	) {
		return { role: 'tool', toolCallId: val.toolCallId, name: val.name, content: val.content };
	}
	return undefined;
}

function messagesOfWire(value: unknown): ChatMessage[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const messages = value.flatMap((entry) => messageOfWire(entry) ?? []);
	return messages.length === value.length ? messages : undefined;
}

function chatRequestOfWire(value: unknown): ChatRequest | undefined {
	if (!isRecord(value)) return undefined;
	const messages = messagesOfWire(value.messages);
	const { tools, output } = value;
	const toolsValid = tools === undefined || (Array.isArray(tools) && tools.every(isToolDefinition));
	if (!messages || !toolsValid || !(output === undefined || isJsonSchema(output))) return undefined;
	return {
		messages,
		...(Array.isArray(tools) ? { tools: tools.filter(isToolDefinition) } : {}),
		...(output === undefined ? {} : { output }),
	};
}

const wireRequestOf = ({ messages, tools, output }: ChatRequest) => ({
	messages: messages.map(wireMessageOf),
	...(tools
		? { tools: tools.map(({ name, description, input }) => ({ name, description, input })) }
		: {}),
	...(output ? { output } : {}),
});

const wireReplyOf = ({ text, toolCalls, finishReason, usage }: ChatReply) => ({
	text,
	toolCalls: toolCalls.map(({ id, name, args }) => ({ id, name, args })),
	finishReason,
	...(usage ? { usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } } : {}),
});

function replyOfWire(value: unknown): ChatReply | undefined {
	if (
		!isRecord(value) ||
		typeof value.text !== 'string' ||
		typeof value.finishReason !== 'string' ||
		!isToolCalls(value.toolCalls) ||
		!(value.usage === undefined || isTokens(value.usage))
	) {
		return undefined;
	}
	const { text, toolCalls, finishReason, usage } = value;
	return { text, toolCalls, finishReason, ...(usage ? { usage } : {}) };
}

const isVectors = (value: unknown): value is number[][] =>
	Array.isArray(value) &&
	value.every(
		(vector) => Array.isArray(vector) && vector.every((entry) => typeof entry === 'number'),
	);

interface RunCalls {
	readonly calls: GuestCalls;
	/** Ends the binary readers and writers that the guest left open, so no store stream stays open. */
	close(): void;
	/** The host error that a run error names, so the executor sees the error of the host. */
	errorOf(message: string): unknown;
	/** The run input as the guest reads it: `{ "$binary": id }` and `{ "$capability": id }` at the handles. */
	guestInput(input: unknown): Promise<unknown>;
	/** An output item of the guest, with the binaries of this run at its binary fields. */
	hostJson(json: unknown): unknown;
}

/** The context that the executor gives `run()`. `credential` is a getter: read it only when the guest asks. */
type SandboxContext = {
	readonly input: unknown;
	readonly http: Http;
	log(level: LogLevel, message: string): void;
	readonly limits: RunLimits;
	readonly binary?: Binaries;
	readonly credential?: unknown;
	readonly item?: InputItem;
	readonly items?: readonly InputItem[];
	readonly inputs?: Readonly<Record<string, readonly InputItem[]>>;
} & Partial<HostImports<unknown>>;

const LOG_LEVELS: ReadonlySet<string> = new Set(['debug', 'info', 'warn', 'error']);
const isLogLevel = (value: unknown): value is LogLevel =>
	typeof value === 'string' && LOG_LEVELS.has(value);

const isBinary = (value: unknown): value is Binary =>
	isRecord(value) &&
	isRecord(value.meta) &&
	typeof value.meta.mimeType === 'string' &&
	typeof value.read === 'function';

/** The most bytes of one `binary-reader.read`, so a chunk stays a small JSON-RPC message. */
const MAX_CHUNK_BYTES = 4 * 1024 * 1024;

interface Reader {
	readonly chunks: AsyncIterator<Uint8Array>;
	readonly buffered: Buffer[];
	readonly state: { done: boolean };
}

/** The next chunk of at most `max` bytes; an empty chunk at the end. */
async function readChunk(reader: Reader, max: number): Promise<Buffer> {
	for (;;) {
		const size = reader.buffered.reduce((sum, chunk) => sum + chunk.length, 0);
		if (size >= max || reader.state.done) break;
		const next = await reader.chunks.next();
		if (next.done) reader.state.done = true;
		else reader.buffered.push(Buffer.from(next.value));
	}
	const all = Buffer.concat(reader.buffered.splice(0));
	if (all.length > max) reader.buffered.push(all.subarray(max));
	return all.subarray(0, max);
}

interface Writer {
	readonly stream: PassThrough;
	readonly created: Promise<Binary>;
}

interface Capability {
	readonly kind: ProviderKind;
	readonly value: unknown;
}

/** The JSON-RPC resource of a kind in `capabilities`. */
const CAPABILITY_RESOURCES: Readonly<Record<ProviderKind, string>> = {
	chatModel: 'chat-model',
	memory: 'memory',
	tool: 'tool',
	embeddings: 'embeddings',
};

function callsOf(
	context: SandboxContext,
	items: readonly InputItem[],
	contract: VersionManifest['contract'],
): RunCalls {
	const given = new Map<string, unknown>();
	// One counter for all host handles of a run, so a number names one thing only.
	const counter = { next: 1 };
	const tables = new Map<number, DataTable>();
	const files = new Map<number, Binary>();
	const fileIds = new Map<Binary, number>();
	const readers = new Map<number, Reader>();
	const writers = new Map<number, Writer>();
	const supplied = new Map<number, Capability>();
	const capabilities = new Map<number, Capability>();
	const tableOf = (handle: unknown) => {
		const table = typeof handle === 'number' ? tables.get(handle) : undefined;
		if (!table) throw new RpcError(-32602, `No table ${String(handle)}`);
		return table;
	};
	const fileIdOf = (file: Binary) => {
		const known = fileIds.get(file);
		if (known !== undefined) return known;
		const id = counter.next++;
		files.set(id, file);
		fileIds.set(file, id);
		return id;
	};
	const fileOf = (id: unknown) => {
		const file = typeof id === 'number' ? files.get(id) : undefined;
		if (!file) throw new RpcError(-32602, `No binary ${String(id)}`);
		return file;
	};
	const readerOf = (handle: unknown) => {
		const reader = typeof handle === 'number' ? readers.get(handle) : undefined;
		if (!reader) throw new RpcError(-32602, `No binary reader ${String(handle)}`);
		return reader;
	};
	const writerOf = (handle: unknown) => {
		const writer = typeof handle === 'number' ? writers.get(handle) : undefined;
		if (!writer) throw new RpcError(-32602, `No binary writer ${String(handle)}`);
		return writer;
	};
	const closeReader = (handle: number) => {
		const reader = readers.get(handle);
		readers.delete(handle);
		void reader?.chunks.return?.().catch(() => undefined);
	};
	// The store write of a destroyed writer rejects, and `created` ignores that rejection.
	const closeWriter = (handle: number) => {
		writers.get(handle)?.stream.destroy();
		writers.delete(handle);
	};
	const capabilityOf = <K extends ProviderKind>(
		handle: unknown,
		kind: K,
	): ProviderCapabilities[K] => {
		const capability = typeof handle === 'number' ? capabilities.get(handle) : undefined;
		const value = capability?.value;
		if (capability?.kind !== kind || !provider.is(kind, value)) {
			throw new RpcError(-32602, `No ${kind} ${String(handle)}`);
		}
		return value;
	};
	const imports = (name: HostImport) => {
		const service = context[name];
		if (service === undefined) throw new RpcError(-32601, `${name} is not granted`);
		return service;
	};
	const dataTables = () => {
		const service = imports('dataTables');
		if (typeof service === 'function') throw new RpcError(-32601, 'dataTables is not granted');
		if (!('open' in service)) throw new RpcError(-32601, 'dataTables is not granted');
		return service;
	};
	const binaries = () => {
		if (!context.binary) throw new RpcError(-32601, 'binary is not granted');
		return context.binary;
	};
	const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
	/** A failed `result<_, string>`; the run error that names it gives the executor the host error. */
	const textFailure = (error: unknown) => {
		given.set(errorText(error), error);
		return resultError(errorText(error));
	};
	/** A failed `result<_, run-error>` of a capability. */
	const runFailure = (error: unknown) => {
		const message = errorText(error);
		given.set(message, error);
		return resultError(message, {
			message,
			...(isHttpError(error) ? { response: httpErrorOf(error, message) } : {}),
		});
	};
	/** The request options of an `http-request`, or of a `binary-request` without `body`. */
	const requestOf = (request: unknown, withBody: boolean): HttpRequest => {
		if (
			!isRecord(request) ||
			!isHttpMethod(request.method) ||
			!isRecord(request.target) ||
			typeof request.target.val !== 'string' ||
			!isPairs(request.query) ||
			!isPairs(request.headers)
		) {
			throw new RpcError(-32602, 'The request is not an http-request');
		}
		const { val } = request.target;
		const target =
			// The guest built its path with `path`; the wire drops the brand.
			request.target.tag === 'url' ? { url: val } : isRequestPath(val) ? { path: val } : undefined;
		if (!target) {
			throw resultError('transport', {
				tag: 'transport',
				val: 'The request path must start with one "/"',
			});
		}
		return {
			...target,
			method: request.method,
			query: queryOf(request.query),
			headers: Object.fromEntries(request.headers),
			...(withBody && 'body' in request ? { body: request.body } : {}),
			...(typeof request.timeoutMs === 'number' ? { timeoutMs: request.timeoutMs } : {}),
			...(typeof request.retry === 'boolean' ? { retry: request.retry } : {}),
		};
	};
	/** Sends a request through the executor; a failure is the `http-failure` of the WIT `result`. */
	const send = async (options: HttpRequest) => {
		try {
			const response = await context.http.request({ ...options, fullResponse: true });
			if (!isFullResponse(response))
				throw new UnexpectedError('The HTTP client gave no full response');
			return {
				status: response.statusCode,
				headers: headerPairsOf(response.headers),
				body: response.body ?? null,
			};
		} catch (error) {
			const message = errorText(error);
			given.set(message, error);
			throw isHttpError(error)
				? resultError('response', { tag: 'response', val: httpErrorOf(error, message) })
				: resultError('transport', { tag: 'transport', val: message });
		}
	};
	const shape = shapeOf(contract.input);
	const providerFields = providerInputsOf(shape);
	const binaryKeys = Object.entries(contract.output.properties ?? {})
		.filter(([, field]) => field['x-n8n-binary'] === true)
		.map(([key]) => key);
	const guestInput = async (input: unknown) => {
		const withFiles = await withBinaries(input, contract.input, async (file) => {
			if (!isBinary(file)) throw new UnexpectedError(`${String(file)} is not a binary`);
			return { $binary: fileIdOf(file) };
		});
		if (!isRecord(withFiles) || providerFields.length === 0) return withFiles;
		const refOf = (kind: ProviderKind) => (value: unknown) => {
			const id = counter.next++;
			supplied.set(id, { kind, value });
			return { $capability: id };
		};
		const refs = providerFields.flatMap(({ name, kind, many }) => {
			const value = withFiles[name];
			if (value === undefined) return [];
			return [[name, many && Array.isArray(value) ? value.map(refOf(kind)) : refOf(kind)(value)]];
		});
		return { ...withFiles, ...Object.fromEntries(refs) };
	};
	// A field that names no binary of this run stays as it is, so the executor refuses it.
	const hostJson = (json: unknown) =>
		binaryKeys.length === 0 || !isRecord(json)
			? json
			: Object.fromEntries(
					Object.entries(json).map(([key, value]) => {
						const id = binaryKeys.includes(key) && isRecord(value) ? value.$binary : undefined;
						const file = typeof id === 'number' ? files.get(id) : undefined;
						return [key, file ?? value];
					}),
				);
	const calls: GuestCalls = async (method, params) => {
		switch (method) {
			case 'http.request':
				return await send(requestOf(params.request, true));
			case 'log.log':
				if (isLogLevel(params.level)) context.log(params.level, String(params.message));
				return null;
			case 'limits.get':
				return { maxRequests: context.limits.maxRequests, maxItems: context.limits.maxItems };
			case 'run-credential.get':
				try {
					const { credential } = context;
					return isRecord(credential) ? { type: credential.type, fields: credential.fields } : null;
				} catch (error) {
					// The host error can quote stored values, so the guest gets a fixed text.
					const message = 'The stored data of the credential does not match its declared fields';
					given.set(message, error);
					throw resultError(message);
				}
			case 'binary.open': {
				const { id } = params;
				if (typeof id !== 'number' || !files.has(id)) throw resultError(`No binary ${String(id)}`);
				return id;
			}
			case 'binary.binary.meta': {
				const { mimeType, fileName, bytes } = fileOf(params.self).meta;
				return {
					mimeType,
					...(fileName === undefined ? {} : { fileName }),
					...(bytes === undefined ? {} : { bytes }),
				};
			}
			case 'binary.binary.id':
				fileOf(params.self);
				return params.self;
			case 'binary.binary.reader': {
				const chunks = fileOf(params.self).read()[Symbol.asyncIterator]();
				const handle = counter.next++;
				readers.set(handle, { chunks, buffered: [], state: { done: false } });
				return handle;
			}
			case 'binary.binary-reader.read': {
				const reader = readerOf(params.self);
				const { maxBytes } = params;
				if (typeof maxBytes !== 'number') throw new RpcError(-32602, 'read needs maxBytes');
				try {
					const chunk = await readChunk(reader, Math.min(maxBytes, MAX_CHUNK_BYTES));
					return chunk.toString('base64');
				} catch (error) {
					throw textFailure(error);
				}
			}
			case 'binary.binary-reader.[drop]':
				closeReader(Number(params.self));
				return null;
			case 'binary.binary-writer.[new]': {
				const { mimeType, fileName } = params;
				if (
					typeof mimeType !== 'string' ||
					!(fileName === undefined || typeof fileName === 'string')
				) {
					throw new RpcError(-32602, 'A binary writer needs a MIME type');
				}
				const stream = new PassThrough();
				const meta = { mimeType, ...(fileName === undefined ? {} : { fileName }) };
				const created = binaries().create(meta, stream);
				// A failed store write rejects at `write` or `finish`.
				created.catch(() => undefined);
				const handle = counter.next++;
				writers.set(handle, { stream, created });
				return handle;
			}
			case 'binary.binary-writer.write': {
				const { stream, created } = writerOf(params.self);
				if (typeof params.chunk !== 'string') throw new RpcError(-32602, 'write needs a chunk');
				try {
					if (!stream.write(Buffer.from(params.chunk, 'base64'))) {
						await Promise.race([once(stream, 'drain'), created]);
					}
					return null;
				} catch (error) {
					throw textFailure(error);
				}
			}
			case 'binary.binary-writer.finish': {
				const { stream, created } = writerOf(params.writer);
				writers.delete(Number(params.writer));
				stream.end();
				try {
					return fileIdOf(await created);
				} catch (error) {
					throw textFailure(error);
				}
			}
			case 'binary.binary-writer.[drop]':
				closeWriter(Number(params.self));
				return null;
			case 'binary.send':
				return await send({ ...requestOf(params.request, false), body: fileOf(params.body) });
			case 'binary.fetch': {
				const body = params.body === undefined ? undefined : fileOf(params.body);
				const request = requestOf(params.request, body === undefined);
				if (body !== undefined && isRecord(params.request) && 'body' in params.request) {
					throw new RpcError(-32602, 'fetch takes a JSON body or a binary body, not both');
				}
				const response = await send({
					...request,
					...(body === undefined ? {} : { body }),
					response: 'binary',
				});
				if (!isBinary(response.body)) throw new UnexpectedError('The HTTP client gave no binary');
				return { ...response, body: fileIdOf(response.body) };
			}
			case 'supplied.open': {
				const { id } = params;
				const capability = typeof id === 'number' ? supplied.get(id) : undefined;
				if (!capability) throw resultError(`No capability ${String(id)}`);
				const handle = counter.next++;
				capabilities.set(handle, capability);
				return { tag: capability.kind, val: handle };
			}
			case 'capabilities.chat-model.model':
				return capabilityOf(params.self, 'chatModel').model;
			case 'capabilities.chat-model.chat': {
				const model = capabilityOf(params.self, 'chatModel');
				const request = chatRequestOfWire(params.request);
				if (!request) throw new RpcError(-32602, 'chat needs a chat-request');
				try {
					return wireReplyOf(await model.chat(request));
				} catch (error) {
					throw runFailure(error);
				}
			}
			case 'capabilities.memory.load':
				try {
					const messages = await capabilityOf(params.self, 'memory').load();
					return messages.map(wireMessageOf);
				} catch (error) {
					throw error instanceof RpcError ? error : runFailure(error);
				}
			case 'capabilities.memory.save': {
				const memory = capabilityOf(params.self, 'memory');
				const messages = messagesOfWire(params.messages);
				if (!messages) throw new RpcError(-32602, 'save needs chat messages');
				try {
					await memory.save(messages);
					return null;
				} catch (error) {
					throw runFailure(error);
				}
			}
			case 'capabilities.tool.name':
				return capabilityOf(params.self, 'tool').name;
			case 'capabilities.tool.description':
				return capabilityOf(params.self, 'tool').description;
			case 'capabilities.tool.input':
				return capabilityOf(params.self, 'tool').input;
			case 'capabilities.tool.call': {
				const tool = capabilityOf(params.self, 'tool');
				if (!isRecord(params.args)) throw new RpcError(-32602, 'call needs args');
				try {
					return (await tool.call(params.args)) ?? null;
				} catch (error) {
					throw runFailure(error);
				}
			}
			case 'capabilities.embeddings.embed': {
				const embeddings = capabilityOf(params.self, 'embeddings');
				const { texts } = params;
				if (!Array.isArray(texts) || !texts.every((text) => typeof text === 'string')) {
					throw new RpcError(-32602, 'embed needs texts');
				}
				try {
					return await embeddings.embed(texts);
				} catch (error) {
					throw runFailure(error);
				}
			}
			case 'data-tables.open': {
				const { table } = params;
				if (!isRecord(table) || typeof table.val !== 'string') {
					throw new RpcError(-32602, 'data-tables.open needs a table-ref');
				}
				const ref = table.tag === 'id' ? { id: table.val } : { name: table.val };
				const opened = await tableResult(async () => await dataTables().open(ref));
				const handle = counter.next++;
				tables.set(handle, opened);
				return handle;
			}
			case 'data-tables.table.[drop]':
				tables.delete(Number(params.self));
				return null;
			case 'data-tables.table.id':
				return tableOf(params.self).id;
			case 'data-tables.table.columns':
				return await tableResult(async () => await tableOf(params.self).columns());
			case 'data-tables.table.rows': {
				const { query } = params;
				if (
					!isRecord(query) ||
					typeof query.limit !== 'number' ||
					!optionalNumber(query.offset) ||
					!(query.filter === undefined || isFilter(query.filter)) ||
					!(
						query.sort === undefined ||
						(isRecord(query.sort) &&
							typeof query.sort.column === 'string' &&
							isDirection(query.sort.direction))
					)
				) {
					throw new RpcError(-32602, 'rows needs a row-query');
				}
				const { filter, sort, offset, limit } = query;
				return await tableResult(
					async () =>
						await tableOf(params.self).rows({
							limit,
							...(typeof offset === 'number' ? { offset } : {}),
							...(isFilter(filter) ? { filter } : {}),
							...(isRecord(sort) && typeof sort.column === 'string' && isDirection(sort.direction)
								? { sort: { column: sort.column, direction: sort.direction } }
								: {}),
						}),
				);
			}
			case 'data-tables.table.insert': {
				const { rows } = params;
				if (!Array.isArray(rows) || !rows.every(isValues)) {
					throw new RpcError(-32602, 'insert needs rows');
				}
				return await tableResult(async () => await tableOf(params.self).insert(rows));
			}
			case 'data-tables.table.update':
			case 'data-tables.table.upsert': {
				const { filter, values } = params;
				if (!isFilter(filter) || !isValues(values)) {
					throw new RpcError(-32602, `${method} needs a filter and values`);
				}
				const table = tableOf(params.self);
				return await tableResult(async () =>
					method === 'data-tables.table.update'
						? await table.update(filter, values)
						: await table.upsert(filter, values),
				);
			}
			case 'data-tables.table.delete': {
				const { filter } = params;
				if (!isFilter(filter)) throw new RpcError(-32602, 'delete needs a filter');
				return await tableResult(async () => await tableOf(params.self).delete(filter));
			}
			case 'data-tables.table.clear':
				return await tableResult(async () => await tableOf(params.self).clear());
			case 'data-tables.table.rename': {
				const { name } = params;
				if (typeof name !== 'string') throw new RpcError(-32602, 'rename needs a name');
				return await tableResult(async () => await tableOf(params.self).rename(name));
			}
			case 'data-tables.table.drop':
				return await tableResult(async () => await tableOf(params.self).drop());
			case 'data-tables.list': {
				const { query } = params;
				if (
					!isRecord(query) ||
					typeof query.limit !== 'number' ||
					!optionalNumber(query.offset) ||
					!(query.name === undefined || typeof query.name === 'string')
				) {
					throw new RpcError(-32602, 'data-tables.list needs a list-query');
				}
				const { sort, limit } = query;
				const by = isRecord(sort) ? sort.by : undefined;
				const direction = isRecord(sort) ? sort.direction : undefined;
				if (sort !== undefined && !(isTableField(by) && isDirection(direction))) {
					throw new RpcError(-32602, 'data-tables.list needs a table-sort');
				}
				const ordered =
					isTableField(by) && isDirection(direction) ? { sort: { by, direction } } : {};
				return await tableResult(
					async () =>
						await dataTables().list({
							limit,
							...(typeof query.offset === 'number' ? { offset: query.offset } : {}),
							...(typeof query.name === 'string' ? { name: query.name } : {}),
							...ordered,
						}),
				);
			}
			case 'data-tables.create': {
				const { table } = params;
				if (!isRecord(table) || typeof table.name !== 'string' || !Array.isArray(table.columns)) {
					throw new RpcError(-32602, 'data-tables.create needs a new-table');
				}
				const columns = table.columns.flatMap((column) =>
					isRecord(column) && typeof column.name === 'string' && isColumnType(column.type)
						? [{ name: column.name, type: column.type }]
						: [],
				);
				if (columns.length !== table.columns.length) {
					throw new RpcError(-32602, 'data-tables.create needs columns');
				}
				const name = table.name;
				return await tableResult(async () => await dataTables().create({ name, columns }));
			}
			case 'code.run': {
				const { request } = params;
				const code = imports('code');
				if (
					!isRecord(request) ||
					(request.language !== 'javascript' && request.language !== 'python') ||
					typeof request.code !== 'string' ||
					(request.mode !== 'all' && request.mode !== 'each') ||
					!('run' in code)
				) {
					throw new RpcError(-32602, 'code.run needs a code-request');
				}
				const { language, mode } = request;
				const source = request.code;
				return await tableResult(async () => await code.run({ language, code: source, mode }));
			}
			case 'wait.until': {
				const wait = imports('wait');
				if (typeof params.at !== 'number' || !('until' in wait)) {
					throw new RpcError(-32602, 'wait.until needs a time');
				}
				const at = new Date(params.at);
				await tableResult(async () => await wait.until(at));
				return null;
			}
			case 'input-of.get': {
				const inputOf = imports('inputOf');
				const item = typeof params.item === 'number' ? items[params.item] : undefined;
				if (!item || typeof inputOf !== 'function') {
					throw resultError(`No input item ${String(params.item)}`);
				}
				return await tableResult(async () => await inputOf(item));
			}
			// A binary stays for the node execution, so a dropped handle can still be an output.
			case 'binary.binary.[drop]':
				return null;
			case 'capabilities.chat-model.[drop]':
			case 'capabilities.memory.[drop]':
			case 'capabilities.tool.[drop]':
			case 'capabilities.embeddings.[drop]':
				capabilities.delete(Number(params.self));
				return null;
			default:
				throw new RpcError(-32601, `method not found: ${method}`);
		}
	};
	const close = () => {
		[...readers.keys()].forEach(closeReader);
		[...writers.keys()].forEach(closeWriter);
	};
	return { calls, close, errorOf: (message) => given.get(message), guestInput, hostJson };
}

// ── The sandboxed action ────────────────────────────────────────────────────────────────

/** The connection of the current node execution, so its items share one component instance. */
const sessions = new AsyncLocalStorage<() => Promise<Connection>>();

const isOutputs = (
	value: unknown,
): value is { outputs: unknown[]; done: boolean; error?: unknown } =>
	isRecord(value) && Array.isArray(value.outputs) && typeof value.done === 'boolean';

/** The error of a run error: the host error it names, else a new error with its response. */
function runErrorOf(error: unknown, calls: RunCalls): unknown {
	const message =
		isRecord(error) && typeof error.message === 'string' ? error.message : 'The run failed';
	const known = calls.errorOf(message);
	if (known !== undefined) return known;
	const response = isRecord(error) ? error.response : undefined;
	if (!isRecord(response)) return new UserError(message);
	return Object.assign(new UserError(message), {
		status: response.status,
		headers: Object.fromEntries(isPairs(response.headers) ? response.headers : []),
		body: response.body,
	});
}

interface RunPlan {
	readonly id: string;
	readonly resource: 'item-run' | 'join-run';
	readonly items: readonly InputItem[];
	/** The constructor parameters, with the run input as the guest reads it. */
	params(input: unknown): Record<string, unknown>;
	/** The value the executor reads for one output of the guest. */
	valueOf(output: unknown, hostJson: (json: unknown) => unknown): unknown;
}

async function* outputsOf(
	plan: RunPlan,
	context: SandboxContext,
	start: () => Promise<Connection>,
	contract: VersionManifest['contract'],
) {
	const shared = sessions.getStore();
	const connection = await (shared ?? start)();
	const calls = callsOf(context, plan.items, contract);
	const stop = connection.serve(calls.calls);
	const handles = new Map<'handle', unknown>();
	try {
		const params = plan.params(await calls.guestInput(context.input));
		const handle = await connection.request(`action.${plan.resource}.[new]`, params);
		handles.set('handle', handle);
		for (;;) {
			const taken = await connection.request(`action.${plan.resource}.[take]`, {
				self: handle,
				max: TAKE,
			});
			if (!isOutputs(taken)) throw new UnexpectedError(`${plan.id} gave no outputs`);
			for (const output of taken.outputs) yield plan.valueOf(output, calls.hostJson);
			if (taken.error !== undefined) throw runErrorOf(taken.error, calls);
			if (taken.done) return;
		}
	} finally {
		stop();
		calls.close();
		if (handles.has('handle')) {
			connection.notify(`action.${plan.resource}.[drop]`, { self: handles.get('handle') });
		}
		if (!shared) connection.close();
	}
}

const isRouted = (
	value: unknown,
): value is { to?: string; output: { tag: string; val: unknown } } =>
	isRecord(value) &&
	(value.to === undefined || typeof value.to === 'string') &&
	isRecord(value.output) &&
	typeof value.output.tag === 'string';

const isIndexes = (value: unknown): value is number[] =>
	Array.isArray(value) && value.every((index) => typeof index === 'number');

/** One output of an item run as the value `run()` gives in this process. */
function itemValueOf(
	action: Pick<Action, 'id' | 'outputs' | 'flow' | 'output'>,
	items: readonly InputItem[],
) {
	const batch = action.flow.cardinality === 'batch';
	const plain =
		action.outputs === undefined && !batch && action.output.json['x-n8n-passed'] !== true;
	const itemAt = (index: unknown) => (typeof index === 'number' ? items[index] : undefined);
	return (output: unknown, hostJson: (json: unknown) => unknown): unknown => {
		if (!isRouted(output))
			throw new UnexpectedError(`${action.id} gave an output that is not a routed-output`);
		const { to, output: value } = output;
		const route = to === undefined ? {} : { to };
		if (value.tag === 'item') {
			return plain ? hostJson(value.val) : { ...route, json: hostJson(value.val) };
		}
		if (plain)
			throw new UnexpectedError(`${action.id} gave a ${value.tag} output, and it has no routes`);
		if (value.tag === 'passed') return { ...route, item: itemAt(value.val) };
		if (value.tag !== 'made' || !Array.isArray(value.val) || !isIndexes(value.val[1])) {
			throw new UnexpectedError(`${action.id} gave an output that is not an output`);
		}
		const [json, from] = value.val;
		return {
			...route,
			json: hostJson(json),
			from: from.length === 1 ? itemAt(from[0]) : from.map(itemAt),
		};
	};
}

function joinValueOf(id: string, inputs: ReadonlyArray<readonly InputItem[]>) {
	const itemOf = (ref: unknown) =>
		isRecord(ref) && typeof ref.input === 'number' && typeof ref.item === 'number'
			? inputs[ref.input]?.[ref.item]
			: undefined;
	return (output: unknown, hostJson: (json: unknown) => unknown): unknown => {
		if (!isRouted(output))
			throw new UnexpectedError(`${id} gave an output that is not a routed-join-output`);
		const { to, output: value } = output;
		const route = to === undefined ? {} : { to };
		if (value.tag === 'passed') return { ...route, item: itemOf(value.val) };
		if (value.tag !== 'made' || !Array.isArray(value.val) || !Array.isArray(value.val[1])) {
			throw new UnexpectedError(`${id} gave an output that is not a join output`);
		}
		const [json, from] = value.val;
		return {
			...route,
			json: hostJson(json),
			from: from.length === 1 ? itemOf(from[0]) : from.map(itemOf),
		};
	};
}

/** The single output of a per-item run. */
async function only(id: string, outputs: AsyncGenerator<unknown>): Promise<unknown> {
	const values: unknown[] = [];
	for await (const value of outputs) values.push(value);
	if (values.length !== 1)
		throw new UnexpectedError(`${id} is per-item, and it gave ${values.length} outputs`);
	return values[0];
}

/**
 * The node of a bundle. The credential types come from the host by the names of the manifest.
 * The name, the base URL and the scopes text come from `describe()`. The bundle can name only a
 * base URL on an egress host of its manifest: freeze writes the base URL host there.
 */
function nodeOf(
	manifest: VersionManifest,
	described: unknown,
	credentialType: SandboxOptions['credentialType'],
): NodeDefinition {
	const { id, semver, contract } = manifest;
	const node = isRecord(described) ? described.node : undefined;
	if (
		!isRecord(described) ||
		described.id !== id ||
		!isRecord(node) ||
		node.id !== contract.node ||
		typeof node.displayName !== 'string' ||
		!(node.baseUrl === undefined || typeof node.baseUrl === 'string')
	) {
		throw new UserError(`The bundle of ${id}@${semver} describes another action`);
	}
	// The host never runs the credential code of a sandboxed bundle: n8n applies the credential
	// type of this name, so its scheme here is `compat`.
	const types = contract.credentials.map((name): AnyCredentialType => {
		const type = credentialType(name);
		if (!type) {
			throw new UserError(
				`${id}@${semver} uses the credential type ${name}, which n8n does not have`,
			);
		}
		return { ...type, scheme: { kind: 'compat' } };
	});
	const baseHost = typeof node.baseUrl === 'string' ? toHostname(node.baseUrl) : undefined;
	if (
		typeof node.baseUrl === 'string' &&
		!(baseHost && allowsHost(permissionsOf(contract).egress.hosts, baseHost))
	) {
		throw new UserError(
			`The bundle of ${id}@${semver} names the base URL ${node.baseUrl}. Its host is not an egress host of its manifest`,
		);
	}
	const credential: Record<string, unknown> = isRecord(node.credential) ? node.credential : {};
	const scopes = isRecord(credential.scopes) ? credential.scopes : {};
	return {
		id: node.id,
		displayName: node.displayName,
		...(typeof node.baseUrl === 'string' ? { baseUrl: node.baseUrl } : {}),
		...(types.length > 0
			? {
					credential: {
						types,
						scopes: Object.fromEntries(
							Object.entries(scopes).map(([key, text]) => [key, String(text)]),
						),
						optional: credential.optional === true,
					},
				}
			: {}),
	};
}

/** A value that a sandboxed provider gave in the right shape, or an error that names the provider. */
function providerValue<T>(id: string, value: T | undefined, what: string): T {
	if (value === undefined) throw new UserError(`${id} gave ${what} in another shape`);
	return value;
}

/**
 * The capability of a sandboxed provider. Each method call runs `supply()` in a new instance
 * and then the method: the root node calls the capability after the node execution of the
 * provider ended, so the guest keeps no state between two calls. The requests use the context,
 * so the credential, the egress and the request limit of the provider apply.
 */
async function providerCapabilityOf(
	manifest: VersionManifest,
	context: SandboxContext,
	start: () => Promise<Connection>,
): Promise<unknown> {
	const { id, contract } = manifest;
	const kind = providedKindOf(contract.output);
	if (!kind) throw new UnexpectedError(`${id} provides no capability`);
	const resource = `capabilities.${CAPABILITY_RESOURCES[kind]}`;
	const items = context.item ? [context.item] : [];
	type Use<T> = (
		call: (method: string, params?: Record<string, unknown>) => Promise<unknown>,
	) => Promise<T>;
	const supply = async <T>(open: () => Promise<Connection>, shared: boolean, use: Use<T>) => {
		const connection = await open();
		const calls = callsOf(context, items, contract);
		const stop = connection.serve(calls.calls);
		try {
			const capability = await connection.request('provider.supply', { input: context.input });
			if (!isRecord(capability) || capability.tag !== kind || typeof capability.val !== 'number') {
				throw new UserError(`${id} supplied no ${kind}`);
			}
			const self = capability.val;
			const result = await use(
				async (method, params = {}) =>
					await connection.request(`${resource}.${method}`, { ...params, self }),
			);
			connection.notify(`${resource}.[drop]`, { self });
			return result;
		} catch (error) {
			throw isRecord(error) && isRecord(error.data) ? runErrorOf(error.data, calls) : error;
		} finally {
			stop();
			calls.close();
			if (!shared) connection.close();
		}
	};
	const shared = sessions.getStore();
	// The members the root reads without a call come from the instance of this node execution.
	const now = async <T>(use: Use<T>) => await supply(shared ?? start, shared !== undefined, use);
	const later = async <T>(use: Use<T>) => await supply(start, false, use);
	const capability = await (async (): Promise<unknown> => {
		switch (kind) {
			case 'chatModel':
				return {
					model: await now(async (call) => await call('model')),
					chat: async (request: ChatRequest) =>
						providerValue(
							id,
							replyOfWire(
								await later(
									async (call) => await call('chat', { request: wireRequestOf(request) }),
								),
							),
							'a chat reply',
						),
				};
			case 'memory':
				return {
					load: async () =>
						providerValue(
							id,
							messagesOfWire(await later(async (call) => await call('load'))),
							'messages',
						),
					save: async (messages: readonly ChatMessage[]) => {
						await later(
							async (call) => await call('save', { messages: messages.map(wireMessageOf) }),
						);
					},
				};
			case 'tool': {
				const [name, description, input] = await now(
					async (call) => await Promise.all([call('name'), call('description'), call('input')]),
				);
				return {
					name,
					description,
					input,
					call: async (args: Readonly<Record<string, unknown>>) =>
						await later(async (call) => await call('call', { args })),
				};
			}
			case 'embeddings':
				return {
					embed: async (texts: readonly string[]) => {
						const vectors = await later(async (call) => await call('embed', { texts }));
						return providerValue(id, isVectors(vectors) ? vectors : undefined, 'vectors');
					},
				};
		}
	})();
	return providerValue(id, provider.is(kind, capability) ? capability : undefined, `a ${kind}`);
}

const shapeOf = (schema: JsonSchema): Shape => {
	const required = new Set(schema.required ?? []);
	return Object.fromEntries(
		Object.entries(schema.properties ?? {}).map(([name, json]) => [
			name,
			new Schema<unknown, boolean>(json, !required.has(name)),
		]),
	);
};

/**
 * The action of a frozen version that runs in the sandbox. Its contract comes from the
 * signed manifest; the host runs no bundle code. An action without egress reaches only the
 * hosts of its base URLs. `start` opens a connection for a run outside a sandboxed execution,
 * e.g. a fixture replay.
 */
function sandboxedAction(
	manifest: VersionManifest,
	node: NodeDefinition,
	start: () => Promise<Connection>,
): Action {
	const { contract } = manifest;
	const { flow } = contract;
	const shell = {
		id: manifest.id,
		version: contract.version,
		operation: manifest.id.split('.').pop() ?? manifest.id,
		node,
		action: contract.action,
		summary: contract.summary,
		flow,
		input: shapeOf(contract.input),
		inputSchema: contract.input,
		output: new Schema<unknown, false>(contract.output, false),
		credentialTypes: contract.credentials,
		scopes: contract.scopes ?? [],
		...(contract.outputs ? { outputs: contract.outputs } : {}),
		...(contract.inputs ? { inputs: contract.inputs } : {}),
		egress: contract.egress ?? { hosts: [] },
		...(contract.imports ? { imports: contract.imports } : {}),
	};
	const run = (context: SandboxContext): AsyncGenerator<unknown> | Promise<unknown> => {
		if (manifest.kind === 'provider') return providerCapabilityOf(manifest, context, start);
		if (contract.inputs) {
			const inputs = contract.inputs.map((name) => context.inputs?.[name] ?? []);
			return outputsOf(
				{
					id: manifest.id,
					resource: 'join-run',
					params: (input) => ({
						input,
						inputs: inputs.map((list) => list.map(({ json }) => json)),
					}),
					items: inputs[0] ?? [],
					valueOf: joinValueOf(manifest.id, inputs),
				},
				context,
				start,
				contract,
			);
		}
		const items = context.items ?? (context.item ? [context.item] : []);
		const outputs = outputsOf(
			{
				id: manifest.id,
				resource: 'item-run',
				params: (input) => ({ input, items: items.map(({ json }) => json) }),
				items,
				valueOf: itemValueOf(shell, items),
			},
			context,
			start,
			contract,
		);
		return flow.cardinality === 'per-item' ? only(manifest.id, outputs) : outputs;
	};
	return { ...shell, run };
}

// The guest is 13 MB, so its digest is read once per process.
const guestDigests = new Map<string, Promise<string>>();
const guestSha256Of = async (file: string) => {
	const digest =
		guestDigests.get(file) ??
		readFile(file)
			.then((bytes) => createHash('sha256').update(bytes).digest('hex'))
			.catch((error: unknown) => {
				guestDigests.delete(file);
				throw error;
			});
	guestDigests.set(file, digest);
	return await digest;
};

/**
 * A verified bundle in the cache under its hash; the sidecar checks the hash again. The rename
 * makes the write atomic, so a sidecar that starts at the same time never reads part of a file.
 */
async function bundleFileOf(options: SandboxOptions, manifest: VersionManifest, code: string) {
	const dir = path.join(options.cacheDir, 'bundles');
	await mkdir(dir, { recursive: true, mode: 0o700 });
	const file = path.join(dir, `${manifest.bundleHash}.cjs`);
	const partial = `${file}.${randomUUID()}.partial`;
	await writeFile(partial, code, { mode: 0o600 });
	await rename(partial, file);
	return file;
}

/** What the sandbox cannot run. The host runs such a bundle nowhere, not in this process. */
function unsupported({ id, kind, contract }: VersionManifest): string | undefined {
	if (kind !== 'action' && kind !== 'provider') {
		return `${id} is a ${kind}; the sandbox runs actions and providers only`;
	}
	if (kind === 'action') return undefined;
	if (!providedKindOf(contract.output))
		return `${id} is a derived provider; n8n runs its legacy node`;
	const { imports, binary, supplied } = permissionsOf(contract);
	if (binary || imports.length || supplied.length) {
		return `${id} uses more than http, log and limits, which the provider interface does not give`;
	}
	return undefined;
}

/** The action of a frozen version in the sandbox, and the executor that runs it. */
export async function sandboxedVersionOf(frozen: FrozenVersion, options: SandboxOptions) {
	const { manifest } = frozen;
	const missing = unsupported(manifest);
	if (missing) throw new UserError(missing);
	const kind: SandboxKind = manifest.kind === 'provider' ? 'provider' : 'action';
	const code = await verifiedCodeOf(frozen);
	const guest = path.join(options.guests, `${kind}.wasm`);
	const config: SessionConfig = {
		options,
		kind,
		guest,
		guestSha256: await guestSha256Of(guest),
		limits: { ...DEFAULT_LIMITS, ...options.limits },
		manifest,
		bundleFile: await bundleFileOf(options, manifest, code),
		grants: grantsOf(manifest),
	};
	const start = async () => await openSession(config);
	const describing = await start();
	const described = await describing
		.request(`${kind}.describe`, {})
		.finally(() => describing.close());
	const action = sandboxedAction(
		manifest,
		nodeOf(manifest, described, options.credentialType),
		start,
	);
	return { action, start, executor: sandboxedExecutor(executorOf(action), start) };
}

/** One connection for all runs of one node execution, opened at the first run. */
function sandboxedExecutor(executor: Executor, start: () => Promise<Connection>): Executor {
	return async (host) => {
		host.recorder?.path('sandbox');
		const opened = new Map<'connection', Promise<Connection>>();
		const shared = async () => {
			const connection = opened.get('connection') ?? start();
			opened.set('connection', connection);
			return await connection;
		};
		try {
			return await sessions.run(shared, async () => await executor(host));
		} finally {
			void opened.get('connection')?.then(
				(connection) => connection.close(),
				() => undefined,
			);
		}
	};
}

/**
 * The executor loader of a host with a sandbox: a bundle that `inProcess` trusts runs in this
 * process, every other bundle in the sandbox. Both paths use the same host imports, so the
 * egress, credential and limit checks are the same. A sandboxed version gets its credential
 * types from `options.credentialType`, so it needs no HEAD bundle for them.
 */
export function sandboxExecutorLoader(
	options: SandboxOptions,
	inProcess: (manifest: VersionManifest) => boolean = () => false,
): ExecutorLoader {
	return async (frozen, head) =>
		inProcess(frozen.manifest)
			? await loadExecutor(frozen, head)
			: (await sandboxedVersionOf(frozen, options)).executor;
}
