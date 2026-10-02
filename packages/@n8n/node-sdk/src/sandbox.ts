import { spawn } from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { toHostname, UnexpectedError, UserError } from 'n8n-workflow';

import type { AnyCredentialType } from './credentials';
import {
	isHttpError,
	usesBinary,
	usesSupplies,
	type Action,
	type DataTable,
	type DataTableColumnType,
	type DataTableCondition,
	type DataTableFilter,
	type HostImport,
	type HostImports,
	type Http,
	type HttpMethod,
	type InputItem,
	type LogLevel,
	type NodeDefinition,
	type RunLimits,
} from './define';
import { allowsHost } from './egress';
import {
	executorOf,
	loadExecutor,
	verifiedCodeOf,
	type Executor,
	type ExecutorLoader,
	type FrozenVersion,
} from './runtime';
import { Schema, type JsonSchema, type Shape } from './schema';
import { NODE_CONTRACT_VERSION, type VersionManifest } from './version';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The limits of one node execution in the sandbox. The executor enforces requests and items. */
export interface SandboxLimits {
	readonly memoryMb: number;
	/** Guest CPU time. Time in host calls, e.g. HTTP requests, does not count. */
	readonly cpuMs: number;
	/** Wall clock, host calls included. Then the host stops the sidecar. */
	readonly wallMs: number;
	/** The largest message from the sidecar, e.g. one batch of output items. */
	readonly maxMessageBytes: number;
}

export interface SandboxOptions {
	/** The `n8n-sandbox` binary. */
	readonly sidecar: string;
	/** The generic JS guest component, `guest.wasm`. */
	readonly guest: string;
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

interface SessionConfig {
	readonly options: SandboxOptions;
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

/** The imports of the action world that the manifest grants. */
const grantsOf = ({ contract }: VersionManifest) => [
	'http',
	'log',
	'limits',
	...(contract.imports ?? []).map((name) => IMPORT_INTERFACES[name]),
];

/** One sidecar process: one component instance, so one node execution shares no state with another. */
function connect(config: SessionConfig): Connection {
	const { options, limits, manifest, bundleFile, grants } = config;
	const child = spawn(
		options.sidecar,
		[
			...['--wit', SPEC_WIT, '--world', 'action-bundle', '--component', options.guest],
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
		if (!isRecord(started) || started.kind !== 'action') {
			throw new UnexpectedError(`${config.manifest.id} is not an action bundle`);
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

const headerPairsOf = (headers: unknown): Array<[string, string]> =>
	Object.entries(isRecord(headers) ? headers : {}).flatMap(
		([name, value]): Array<[string, string]> =>
			typeof value === 'string' || typeof value === 'number'
				? [[name.toLowerCase(), String(value)]]
				: Array.isArray(value)
					? [[name.toLowerCase(), value.map(String).join(', ')]]
					: [],
	);

const isPath = (value: string): value is `/${string}` => value.startsWith('/');

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

interface RunCalls {
	readonly calls: GuestCalls;
	/** The host error that a run error names, so the executor sees the error of the host. */
	errorOf(message: string): unknown;
}

/** The context that the executor gives `run()`. */
type SandboxContext = {
	readonly input: unknown;
	readonly http: Http;
	log(level: LogLevel, message: string): void;
	readonly limits: RunLimits;
	readonly item?: InputItem;
	readonly items?: readonly InputItem[];
	readonly inputs?: Readonly<Record<string, readonly InputItem[]>>;
} & Partial<HostImports<unknown>>;

const LOG_LEVELS: ReadonlySet<string> = new Set(['debug', 'info', 'warn', 'error']);
const isLogLevel = (value: unknown): value is LogLevel =>
	typeof value === 'string' && LOG_LEVELS.has(value);

function callsOf(context: SandboxContext, items: readonly InputItem[]): RunCalls {
	const given = new Map<string, unknown>();
	const tables = new Map<number, DataTable>();
	const counter = { next: 1 };
	const tableOf = (handle: unknown) => {
		const table = typeof handle === 'number' ? tables.get(handle) : undefined;
		if (!table) throw new RpcError(-32602, `No table ${String(handle)}`);
		return table;
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
	const http = async ({ request }: Record<string, unknown>) => {
		if (
			!isRecord(request) ||
			!isHttpMethod(request.method) ||
			!isRecord(request.target) ||
			typeof request.target.val !== 'string' ||
			!isPairs(request.query) ||
			!isPairs(request.headers)
		) {
			throw new RpcError(-32602, 'http.request needs an http-request');
		}
		const { val } = request.target;
		const target =
			request.target.tag === 'url' ? { url: val } : isPath(val) ? { path: val } : undefined;
		if (!target) {
			throw resultError('transport', {
				tag: 'transport',
				val: 'The request path must start with one "/"',
			});
		}
		try {
			const response = await context.http.request({
				...target,
				method: request.method,
				query: queryOf(request.query),
				headers: Object.fromEntries(request.headers),
				...('body' in request ? { body: request.body } : {}),
				...(typeof request.timeoutMs === 'number' ? { timeoutMs: request.timeoutMs } : {}),
				...(typeof request.retry === 'boolean' ? { retry: request.retry } : {}),
				fullResponse: true,
			});
			if (!isFullResponse(response))
				throw new UnexpectedError('The HTTP client gave no full response');
			return {
				status: response.statusCode,
				headers: headerPairsOf(response.headers),
				body: response.body ?? null,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			given.set(message, error);
			throw isHttpError(error)
				? resultError('response', {
						tag: 'response',
						val: {
							message,
							status: error.status,
							headers: headerPairsOf(error.headers),
							body: error.body ?? null,
						},
					})
				: resultError('transport', { tag: 'transport', val: message });
		}
	};
	const calls: GuestCalls = async (method, params) => {
		switch (method) {
			case 'http.request':
				return await http(params);
			case 'log.log':
				if (isLogLevel(params.level)) context.log(params.level, String(params.message));
				return null;
			case 'limits.get':
				return { maxRequests: context.limits.maxRequests, maxItems: context.limits.maxItems };
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
			default:
				throw new RpcError(-32601, `method not found: ${method}`);
		}
	};
	return { calls, errorOf: (message) => given.get(message) };
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
	readonly params: Record<string, unknown>;
	readonly items: readonly InputItem[];
	/** The value the executor reads for one output of the guest. */
	valueOf(output: unknown): unknown;
}

async function* outputsOf(
	plan: RunPlan,
	context: SandboxContext,
	start: () => Promise<Connection>,
) {
	const shared = sessions.getStore();
	const connection = await (shared ?? start)();
	const calls = callsOf(context, plan.items);
	const stop = connection.serve(calls.calls);
	const handles = new Map<'handle', unknown>();
	try {
		const handle = await connection.request(`action.${plan.resource}.[new]`, plan.params);
		handles.set('handle', handle);
		for (;;) {
			const taken = await connection.request(`action.${plan.resource}.[take]`, {
				self: handle,
				max: TAKE,
			});
			if (!isOutputs(taken)) throw new UnexpectedError(`${plan.id} gave no outputs`);
			for (const output of taken.outputs) yield plan.valueOf(output);
			if (taken.error !== undefined) throw runErrorOf(taken.error, calls);
			if (taken.done) return;
		}
	} finally {
		stop();
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
	return (output: unknown): unknown => {
		if (!isRouted(output))
			throw new UnexpectedError(`${action.id} gave an output that is not a routed-output`);
		const { to, output: value } = output;
		const route = to === undefined ? {} : { to };
		if (value.tag === 'item') return plain ? value.val : { ...route, json: value.val };
		if (plain)
			throw new UnexpectedError(`${action.id} gave a ${value.tag} output, and it has no routes`);
		if (value.tag === 'passed') return { ...route, item: itemAt(value.val) };
		if (value.tag !== 'made' || !Array.isArray(value.val) || !isIndexes(value.val[1])) {
			throw new UnexpectedError(`${action.id} gave an output that is not an output`);
		}
		const [json, from] = value.val;
		return { ...route, json, from: from.length === 1 ? itemAt(from[0]) : from.map(itemAt) };
	};
}

function joinValueOf(id: string, inputs: ReadonlyArray<readonly InputItem[]>) {
	const itemOf = (ref: unknown) =>
		isRecord(ref) && typeof ref.input === 'number' && typeof ref.item === 'number'
			? inputs[ref.input]?.[ref.item]
			: undefined;
	return (output: unknown): unknown => {
		if (!isRouted(output))
			throw new UnexpectedError(`${id} gave an output that is not a routed-join-output`);
		const { to, output: value } = output;
		const route = to === undefined ? {} : { to };
		if (value.tag === 'passed') return { ...route, item: itemOf(value.val) };
		if (value.tag !== 'made' || !Array.isArray(value.val) || !Array.isArray(value.val[1])) {
			throw new UnexpectedError(`${id} gave an output that is not a join output`);
		}
		const [json, from] = value.val;
		return { ...route, json, from: from.length === 1 ? itemOf(from[0]) : from.map(itemOf) };
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

/** The hosts that the manifest and the host allow: the egress hosts and the credential hosts. */
const trustedHostsOf = (manifest: VersionManifest, types: readonly AnyCredentialType[]) => [
	...(manifest.contract.egress?.hosts ?? []).filter((host) => !host.includes('{')),
	...types.flatMap(({ hosts, baseUrl }) => [
		...(hosts ?? []),
		...(typeof baseUrl === 'string' ? [baseUrl] : Object.values(baseUrl?.values ?? {})).flatMap(
			(url) => toHostname(url) ?? [],
		),
	]),
];

/**
 * The node of a bundle. The credential types come from the host by the names of the manifest.
 * The name, the base URL and the scopes text come from `describe()`. The bundle can name only a
 * base URL on a host that the manifest or a credential type allows (backlog E7).
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
		!(baseHost && allowsHost(trustedHostsOf(manifest, types), baseHost))
	) {
		throw new UserError(
			`The bundle of ${id}@${semver} names the base URL ${node.baseUrl}. Its host is not an egress host or a credential host`,
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
		semver: manifest.semver,
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
		if (contract.inputs) {
			const inputs = contract.inputs.map((name) => context.inputs?.[name] ?? []);
			return outputsOf(
				{
					id: manifest.id,
					resource: 'join-run',
					params: {
						input: context.input,
						inputs: inputs.map((list) => list.map(({ json }) => json)),
					},
					items: inputs[0] ?? [],
					valueOf: joinValueOf(manifest.id, inputs),
				},
				context,
				start,
			);
		}
		const items = context.items ?? (context.item ? [context.item] : []);
		const outputs = outputsOf(
			{
				id: manifest.id,
				resource: 'item-run',
				params: { input: context.input, items: items.map(({ json }) => json) },
				items,
				valueOf: itemValueOf(shell, items),
			},
			context,
			start,
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

/** What the sandbox cannot run yet. The host runs such a bundle nowhere, not in this process. */
function unsupported({ id, kind, nodeContract, contract }: VersionManifest): string | undefined {
	if (kind !== 'action') return `${id} is a ${kind}; the sandbox runs actions only`;
	if (nodeContract.startsWith('1.'))
		return `${id} targets Node Contract ${nodeContract}; the sandbox runs 2.1.0 or newer`;
	if (usesBinary(contract)) return `${id} uses binary data, which the sandbox does not have yet`;
	if (usesSupplies(contract)) return `${id} uses providers, which the sandbox does not have yet`;
	return undefined;
}

/** The action of a frozen version in the sandbox, and the executor that runs it. */
export async function sandboxedVersionOf(frozen: FrozenVersion, options: SandboxOptions) {
	const { manifest } = frozen;
	const missing = unsupported(manifest);
	if (missing) throw new UserError(missing);
	const code = await verifiedCodeOf(frozen);
	const config: SessionConfig = {
		options,
		guestSha256: await guestSha256Of(options.guest),
		limits: { ...DEFAULT_LIMITS, ...options.limits },
		manifest,
		bundleFile: await bundleFileOf(options, manifest, code),
		grants: grantsOf(manifest),
	};
	const start = async () => await openSession(config);
	const describing = await start();
	const described = await describing
		.request('action.describe', {})
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
