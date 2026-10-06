import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { toHostname, UnexpectedError, UserError } from 'n8n-workflow';

import { compatTypeOfManifest, type AnyCredentialType } from './credentials';
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
import { fileRequestIssues, isFileExtractRequest } from './host-imports';
import type { RunRecorder, RunRequest, RunRpc, RunSandboxStats } from './profile';
import {
	executorOf,
	loadExecutor,
	verifiedCodeOf,
	withBinaries,
	type ChunkContext,
	type ChunkRunner,
	type Executor,
	type CredentialManifestOf,
	type ExecutorLoader,
	type FrozenVersion,
	type HostRuntime,
	type ItemOutcome,
} from './runtime';
import { hasBinary, Schema, shapeOf, type Binary, type JsonSchema } from './schema';
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
import { outputBinaryKeys } from './validate';
import { validateUntrusted } from './validator';
import {
	assertWebhookSignature,
	loadTriggerExecutor,
	TRIGGER_RUN,
	triggerCallOf,
	type TriggerCall,
} from './triggers';
import { runtimeNameOf, type RuntimePolicy } from './runtime-policy';
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
	/** The `n8n-sandbox` binary. The default runtime needs it. */
	readonly sidecar?: string;
	/** The directory of the generic JS guest components: `action.wasm`, `provider.wasm` and `trigger.wasm`. */
	readonly guests?: string;
	/** Where the guests run. Default: `wasmSidecarRuntime` with `sidecar` and `guests`. */
	readonly runtime?: GuestRuntime;
	/**
	 * A directory that only n8n can write. It holds the compiled guest and the verified bundles,
	 * and the sidecar loads native code from it.
	 */
	readonly cacheDir: string;
	/**
	 * The credential type of a name that has no credential manifest in the store of the host, e.g. a
	 * compat type that n8n has. A credential manifest comes first (`HostRuntime.credentialManifestOf`). The
	 * hosts and the base URL of a credential never come from the bundle.
	 */
	readonly credentialType: (name: string) => AnyCredentialType | undefined;
	/** Limits that replace the defaults of `SandboxLimits`. */
	readonly limits?: Partial<SandboxLimits>;
	/**
	 * Runs the items of a `per-item` action in `chunk-run`s, not in one `item-run` per item. The
	 * guest must export `chunk-run`. Default: off.
	 */
	readonly chunkItems?: boolean;
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

/** The JSON-RPC error answer for an error of a guest call; an unknown error is −32603. */
const errorAnswer = (error: unknown) => {
	const rpc =
		error instanceof RpcError
			? error
			: new RpcError(-32603, error instanceof Error ? error.message : String(error));
	return { error: { code: rpc.code, message: rpc.message, data: rpc.data } };
};

type GuestCalls = (method: string, params: Record<string, unknown>) => Promise<unknown>;

/** A JSON-RPC connection to one guest, see `spec/json-rpc.md`. */
export interface Connection {
	/** Sends a request to the guest and gives its result. */
	request(method: string, params: Record<string, unknown>): Promise<unknown>;
	/** Sends a notification to the guest. */
	notify(method: string, params: Record<string, unknown>): void;
	/** The guest calls go to `calls` until the returned function runs. */
	serve(calls: GuestCalls): () => boolean;
	/**
	 * Adds each later message to the run profile of `recorder` until the returned function runs. A
	 * transport that cannot measure its messages does not have it.
	 */
	trace?(recorder: RunRecorder): () => boolean;
	/** Stops the guest. */
	close(): void;
}

/** The kinds whose interface the sandbox runs, each with its own guest component. */
export type SandboxKind = 'action' | 'provider' | 'trigger';

const SANDBOX_KINDS: readonly SandboxKind[] = ['action', 'provider', 'trigger'];

/** What a runtime needs to start a guest for one bundle. */
export interface GuestSession {
	/** The interface that the guest runs. */
	readonly kind: SandboxKind;
	/** The verified manifest of the bundle. */
	readonly manifest: VersionManifest;
	/** The verified bundle, named by its hash. */
	readonly bundleFile: string;
	/** The imports of the world that the manifest grants. */
	readonly grants: readonly string[];
	/** The limits of the session. */
	readonly limits: SandboxLimits;
	/** A directory that only n8n can write. */
	readonly cacheDir: string;
}

/**
 * Starts guests that speak `spec/json-rpc.md`. The host checks stay in this module, so every
 * runtime gets the same egress, credential and output checks. The host sends `[initialize]`.
 */
export interface GuestRuntime {
	/** The name in logs and run profiles, e.g. `worker`. */
	readonly name: string;
	/** Starts a guest for one session. */
	start(session: GuestSession): Promise<Connection>;
	/**
	 * The compiled guests of the session in the cache. A runtime that compiles no guest does not
	 * have it.
	 */
	compiled?(session: GuestSession): Promise<readonly string[]>;
}

const IMPORT_INTERFACES: Readonly<Record<HostImport, string>> = {
	dataTables: 'data-tables',
	parsers: 'parsers',
	code: 'code',
	wait: 'wait',
	inputOf: 'input-of',
};

/** Whether the items of this action run in `chunk-run`s. */
const chunksItems = ({ kind, contract }: VersionManifest, { chunkItems }: SandboxOptions) =>
	chunkItems === true &&
	kind === 'action' &&
	contract.flow.cardinality === 'per-item' &&
	contract.inputs === undefined;

/**
 * The imports of the world that the manifest grants. A provider gets only the base imports. A
 * trigger gets no credential data: the host applies the credential to each request.
 */
const grantsOf = ({ kind, contract }: VersionManifest, chunked: boolean) => {
	if (kind === 'trigger') return ['http', 'log', 'limits', 'schema'];
	const { imports, binary, supplied } = permissionsOf(contract);
	return [
		'http',
		'log',
		'limits',
		'schema',
		'run-credential',
		...(chunked ? ['chunk'] : []),
		...(kind === 'provider'
			? []
			: [
					...imports.map((name) => IMPORT_INTERFACES[name]),
					...(binary ? ['binary'] : []),
					...(supplied.length ? ['supplied', 'capabilities'] : []),
				]),
	];
};

/** A message line that the host wrote or read, for the profile. */
interface Line {
	readonly startMs: number;
	readonly bytes: number;
	/** The time to encode or decode the line. */
	readonly ms: number;
}

/** An answer of the guest to a host call. */
interface Answer {
	readonly message: Record<string, unknown>;
	readonly line?: Line;
}

/** The guest call that the host answers now, so an HTTP attempt names the call that sent it. */
const guestCalls = new AsyncLocalStorage<number>();

/** The guests of `wasmSidecarRuntime`: one wasmtime sidecar process per session. */
export interface WasmSidecarOptions {
	/** The `n8n-sandbox` binary. */
	readonly sidecar: string;
	/** The directory with `action.wasm` and `provider.wasm`. */
	readonly guests: string;
}

/** What one sidecar process runs. Without a bundle, the sidecar only compiles and starts the guest. */
interface SidecarRun {
	readonly kind: SandboxKind;
	readonly limits: SandboxLimits;
	readonly grants: readonly string[];
	readonly cacheDir: string;
	readonly nodeContract: string;
	readonly bundle?: { readonly file: string; readonly sha256: string };
}

async function spawnSidecar({ sidecar, guests }: WasmSidecarOptions, run: SidecarRun) {
	const { kind, limits, bundle } = run;
	const guest = path.join(guests, `${kind}.wasm`);
	return spawn(
		sidecar,
		[
			...['--wit', SPEC_WIT, '--world', `${kind}-bundle`, '--component', guest],
			...['--component-sha256', await guestSha256Of(guest)],
			...run.grants.flatMap((grant) => ['--grant', grant]),
			...(bundle ? ['--bundle', bundle.file, '--bundle-sha256', bundle.sha256] : []),
			...['--node-contract', run.nodeContract, '--cache', run.cacheDir],
			...['--memory-mb', String(limits.memoryMb), '--cpu-ms', String(limits.cpuMs)],
		],
		{ stdio: ['pipe', 'pipe', 'pipe'], env: {}, windowsHide: true },
	);
}

/** One sidecar process: one component instance, so one node execution shares no state with another. */
export function wasmSidecarRuntime(options: WasmSidecarOptions): GuestRuntime {
	return {
		name: 'wasm-sidecar',
		async start(session) {
			const { manifest } = session;
			const child = await spawnSidecar(options, {
				...session,
				nodeContract: manifest.nodeContract,
				bundle: { file: session.bundleFile, sha256: manifest.bundleHash },
			});
			return connectChild(child, { limits: session.limits, label: manifest.id });
		},
		async compiled({ kind, cacheDir }) {
			const digest = await guestSha256Of(path.join(options.guests, `${kind}.wasm`));
			// The sidecar names a compiled guest `<digest>-<engine>.cwasm`.
			return (await readdir(cacheDir).catch((): string[] => [])).filter(
				(name) => name.startsWith(`${digest}-`) && name.endsWith('.cwasm'),
			);
		},
	};
}

/** Where `connectLines` writes the messages of the host, and how it stops the guest. */
export interface LineTransport {
	/** Writes one message line to the guest, without the line end. */
	write(line: string): void;
	/** Stops the guest at once. */
	stop(): void;
}

/** The limits and the name of a session, for the errors of a connection. */
export interface ConnectionOptions {
	/** The limits of the session. */
	readonly limits: SandboxLimits;
	/** The name of the session in the errors, e.g. the action id. */
	readonly label: string;
}

/** A `Connection` that gets the message lines of the guest from its transport. */
export interface LineConnection extends Connection {
	/** Handles one message line of the guest. A line that is not valid stops the guest. */
	receive(line: string): void;
	/** Rejects the waiting requests and stops the guest. The first error stays. */
	fail(error: Error): void;
	trace(recorder: RunRecorder): () => boolean;
}

/**
 * The JSON-RPC part of a connection to a guest that speaks `spec/json-rpc.md` one message per line,
 * over any transport, e.g. a worker thread. `connectChild` adds a child process. It stops the
 * guest at the wall clock limit and on a line larger than `maxMessageBytes`.
 */
export function connectLines(
	transport: LineTransport,
	{ limits, label }: ConnectionOptions,
): LineConnection {
	const pending = new Map<number, { resolve(answer: Answer): void; reject(error: Error): void }>();
	const state = { next: 1, rpc: 1 };
	const traced = new Map<'recorder', RunRecorder>();
	const served = new Map<'calls', GuestCalls>();
	const failure = new Map<'error', Error>();
	// The wall clock starts at the first request, so a prestarted guest loses no run time.
	const timers = new Map<'wall', NodeJS.Timeout>();
	const fail = (error: Error) => {
		if (!failure.has('error')) failure.set('error', error);
		clearTimeout(timers.get('wall'));
		pending.forEach(({ reject }) => reject(error));
		pending.clear();
		transport.stop();
	};
	const startClock = () => {
		if (timers.has('wall')) return;
		timers.set(
			'wall',
			setTimeout(
				() => fail(new UserError(`${label} ran longer than ${limits.wallMs} ms and was stopped`)),
				limits.wallMs,
			),
		);
	};
	/** Writes a message. With a recorder, it gives the line for the profile. */
	const send = (message: Record<string, unknown>): Line | undefined => {
		const recorder = traced.get('recorder');
		// An answer can come after the guest stopped, e.g. at the wall clock limit.
		if (failure.has('error')) return undefined;
		if (!recorder) {
			transport.write(JSON.stringify({ jsonrpc: '2.0', ...message }));
			return undefined;
		}
		const startMs = recorder.now();
		const text = JSON.stringify({ jsonrpc: '2.0', ...message });
		const ms = recorder.now() - startMs;
		transport.write(text);
		return { startMs, bytes: Buffer.byteLength(text), ms };
	};
	const answer = async (
		id: unknown,
		method: string,
		params: Record<string, unknown>,
		line: Line | undefined,
	) => {
		const calls = served.get('calls');
		const recorder = traced.get('recorder');
		const rpcId = state.rpc++;
		const result = await (async () => {
			try {
				if (!calls) throw new RpcError(-32601, `${method} has no run`);
				const value = await (line
					? guestCalls.run(rpcId, async () => await calls(method, params))
					: calls(method, params));
				return { result: value ?? null };
			} catch (error) {
				return errorAnswer(error);
			}
		})();
		// A result that JSON cannot encode, e.g. a circular value, must still answer the guest.
		const { reply, sent } = (() => {
			if (id === undefined) return { reply: result, sent: undefined };
			try {
				return { reply: result, sent: send({ id, ...result }) };
			} catch (error) {
				const fallback = errorAnswer(error);
				return { reply: fallback, sent: send({ id, ...fallback }) };
			}
		})();
		if (!recorder || !line) return;
		recorder.rpc({
			id: rpcId,
			method,
			direction: 'guest_to_host',
			startMs: line.startMs,
			endMs: recorder.now(),
			requestBytes: line.bytes,
			decodeMs: line.ms,
			...(sent ? { responseBytes: sent.bytes, encodeMs: sent.ms } : {}),
			...('error' in reply ? { errorType: String(reply.error.code) } : {}),
		});
	};
	const handle = (text: string) => {
		const recorder = traced.get('recorder');
		const startMs = recorder?.now();
		const message: unknown = JSON.parse(text);
		const line =
			recorder && startMs !== undefined
				? { startMs, bytes: Buffer.byteLength(text), ms: recorder.now() - startMs }
				: undefined;
		if (!isRecord(message))
			throw new UnexpectedError('The sandbox sent a message that is not an object');
		if (typeof message.method === 'string') {
			void answer(message.id, message.method, isRecord(message.params) ? message.params : {}, line);
			return;
		}
		const waiting = typeof message.id === 'number' ? pending.get(message.id) : undefined;
		if (!waiting || typeof message.id !== 'number') return;
		pending.delete(message.id);
		waiting.resolve({ message, line });
	};
	return {
		receive(text) {
			if (Buffer.byteLength(text) > limits.maxMessageBytes) {
				fail(new UserError(`${label} gave a message larger than ${limits.maxMessageBytes} bytes`));
				return;
			}
			try {
				handle(text);
			} catch (error) {
				fail(error instanceof Error ? error : new UnexpectedError(String(error)));
			}
		},
		fail,
		async request(method, params) {
			startClock();
			const known = failure.get('error');
			if (known) throw known;
			const id = state.next++;
			const rpcId = state.rpc++;
			const recorder = traced.get('recorder');
			const answered = new Promise<Answer>((resolve, reject) =>
				pending.set(id, { resolve, reject }),
			);
			const sent = send({ id, method, params });
			const recordCall = (answer: Pick<RunRpc, 'responseBytes' | 'decodeMs' | 'errorType'>) => {
				if (!recorder || !sent) return;
				recorder.rpc({
					id: rpcId,
					method,
					direction: 'host_to_guest',
					startMs: sent.startMs,
					endMs: recorder.now(),
					requestBytes: sent.bytes,
					encodeMs: sent.ms,
					...answer,
				});
			};
			const { message, line } = await answered.catch((error: unknown) => {
				recordCall({ errorType: error instanceof Error ? error.name : typeof error });
				throw error;
			});
			const error = isRecord(message.error) ? message.error : undefined;
			recordCall({
				...(line ? { responseBytes: line.bytes, decodeMs: line.ms } : {}),
				...(error ? { errorType: String(error.code) } : {}),
			});
			if (!error) return message.result;
			const text = typeof error.message === 'string' ? error.message : 'error';
			throw Object.assign(new UserError(text), { code: error.code, data: error.data });
		},
		notify(method, params) {
			const sent = send({ method, params });
			const recorder = traced.get('recorder');
			if (!recorder || !sent) return;
			recorder.rpc({
				id: state.rpc++,
				method,
				direction: 'host_to_guest',
				startMs: sent.startMs,
				endMs: recorder.now(),
				requestBytes: sent.bytes,
				encodeMs: sent.ms,
			});
		},
		serve(calls) {
			// The guest calls carry no run, so one connection runs one run at a time.
			if (served.has('calls')) throw new UnexpectedError(`${label} runs one run at a time`);
			served.set('calls', calls);
			return () => served.delete('calls');
		},
		trace(recorder) {
			traced.set('recorder', recorder);
			return () => traced.delete('recorder');
		},
		close() {
			fail(new UnexpectedError('The sandbox is closed'));
		},
	};
}

/**
 * The connection to a child process that speaks `spec/json-rpc.md` as newline-delimited JSON on
 * stdin and stdout, see `connectLines`.
 */
export function connectChild(
	child: ChildProcessWithoutNullStreams,
	{
		stoppedError,
		...options
	}: ConnectionOptions & {
		/** The error for an exit code that the runtime can explain, e.g. a container at its memory limit. */
		readonly stoppedError?: (code: number | null) => Error | undefined;
	},
): LineConnection {
	const { limits, label } = options;
	const state = { partialLength: 0, stderr: '' };
	// The chunks of an incomplete line, so a long line is joined once.
	const partial: string[] = [];
	const connection = connectLines(
		{
			write: (line) => child.stdin.write(`${line}\n`),
			stop: () => {
				child.stdin.end();
				child.kill('SIGKILL');
			},
		},
		options,
	);
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
		state.partialLength += Buffer.byteLength(open);
		if (state.partialLength > limits.maxMessageBytes) {
			connection.fail(
				new UserError(`${label} gave a message larger than ${limits.maxMessageBytes} bytes`),
			);
			return;
		}
		lines.forEach((line) => connection.receive(line));
	});
	child.stdin.on('error', (error) =>
		connection.fail(new UnexpectedError(`The sandbox connection failed: ${error.message}`)),
	);
	child.stderr.setEncoding('utf8');
	child.stderr.on('data', (chunk: string) => {
		state.stderr = `${state.stderr}${chunk}`.slice(-STDERR_KEPT);
	});
	child.on('error', (error) =>
		connection.fail(new UnexpectedError(`The sandbox did not start: ${error.message}`)),
	);
	child.on('exit', (code, signal) => {
		connection.fail(
			stoppedError?.(code) ??
				new UnexpectedError(
					`The sandbox stopped (${signal ?? `exit ${code}`})${state.stderr ? `: ${state.stderr.trim()}` : ''}`,
				),
		);
	});
	return connection;
}

async function openSession(
	runtime: GuestRuntime,
	config: GuestSession,
	recorder?: RunRecorder,
): Promise<Connection> {
	const before = recorder && runtime.compiled ? await runtime.compiled(config) : [];
	const startMs = recorder?.now();
	const connection = await runtime.start(config);
	if (recorder) connection.trace?.(recorder);
	try {
		const started = await connection.request('[initialize]', {
			nodeContract: NODE_CONTRACT_VERSION,
		});
		if (!isRecord(started) || started.kind !== config.kind) {
			throw new UnexpectedError(
				`${config.manifest.id} is not a bundle of the ${config.kind} interface`,
			);
		}
		if (recorder && startMs !== undefined) {
			const endMs = recorder.now();
			// A compile writes a new file, also when the file of an older engine is there.
			const after = runtime.compiled ? await runtime.compiled(config) : [];
			recorder.phase({
				name: 'sandboxStart',
				startMs,
				endMs,
				compileCached:
					!runtime.compiled || (after.length > 0 && after.every((name) => before.includes(name))),
			});
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
	readonly inputs?: Readonly<Record<string, readonly InputItem[]>> | InputLists;
} & Partial<HostImports<unknown>>;

/** The items of each counted input, in input order. */
type InputLists = ReadonlyArray<readonly InputItem[]>;

const isInputLists = (value: unknown): value is InputLists => Array.isArray(value);

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

/** `contextOf` gives the context of the current item, so a chunk-run serves each item with its own. */
function callsOf(
	contextOf: () => SandboxContext,
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
		const service = contextOf()[name];
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
		const { binary } = contextOf();
		if (!binary) throw new RpcError(-32601, 'binary is not granted');
		return binary;
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
			const response = await contextOf().http.request({ ...options, fullResponse: true });
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
	const outputBinaries = hasBinary(contract.output);
	const isBinaryKey = outputBinaryKeys(contract.output);
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
		!outputBinaries || !isRecord(json)
			? json
			: Object.fromEntries(
					Object.entries(json).map(([key, value]) => {
						const id = isBinaryKey(key) && isRecord(value) ? value.$binary : undefined;
						const file = typeof id === 'number' ? files.get(id) : undefined;
						return [key, file ?? value];
					}),
				);
	const calls: GuestCalls = async (method, params) => {
		switch (method) {
			case 'http.request':
				return await send(requestOf(params.request, true));
			case 'log.log':
				if (isLogLevel(params.level)) contextOf().log(params.level, String(params.message));
				return null;
			case 'limits.get': {
				const { limits } = contextOf();
				return { maxRequests: limits.maxRequests, maxItems: limits.maxItems };
			}
			case 'schema.validate':
				return validateUntrusted(params.value, params.schema, {
					path: typeof params.path === 'string' ? params.path : undefined,
					allowExpressions: params.allowExpressions === true,
				});
			case 'run-credential.get':
				try {
					const { credential } = contextOf();
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
			case 'parsers.extract': {
				const parsers = imports('parsers');
				const { request } = params;
				if (!('extract' in parsers) || !isRecord(request) || !isRecord(request.val)) {
					throw new RpcError(-32602, 'parsers.extract needs an extract-request');
				}
				// A WIT option that is none crosses as null.
				const options = Object.fromEntries(
					Object.entries(request.val).filter(([, value]) => value !== null),
				);
				const read = { format: request.tag, options };
				if (!isFileExtractRequest(read)) {
					throw new RpcError(-32602, fileRequestIssues(read).join('; '));
				}
				const file = fileOf(params.file);
				return await tableResult(
					async () => await parsers.extract(file, read.format, read.options),
				);
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
	const calls = callsOf(() => context, plan.items, contract);
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

/** Items per `chunk-run`, so its constructor message stays small. */
const CHUNK_ITEMS = 1000;

/**
 * One `chunk-run`. The guest names each item with `chunk.item` before the host calls of the
 * item, so each call gets the context of its item. Another index than the next one, a call
 * before the first item, or an outcome before its item fails the run. Another error, e.g. a
 * stopped guest, is the error of each item that has no outcome yet.
 */
async function* chunkRun(
	manifest: VersionManifest,
	valueOf: (items: readonly InputItem[]) => ReturnType<typeof itemValueOf>,
	contexts: readonly ChunkContext[],
	continueOnFail: boolean,
	connection: Connection,
): AsyncGenerator<ItemOutcome> {
	const { id, contract } = manifest;
	const items = contexts.map(({ item }) => item);
	const state = { current: -1, given: 0 };
	const broken = new Map<'error', UnexpectedError>();
	const violation = (message: string) => {
		const error = broken.get('error') ?? new UnexpectedError(`${id} ${message}`);
		broken.set('error', error);
		return error;
	};
	const contextOf = () => {
		const context = contexts[state.current];
		if (!context) throw new RpcError(-32603, `${id} has no current item`);
		return context;
	};
	const calls = callsOf(contextOf, items, contract);
	const served: GuestCalls = async (method, params) => {
		const known = broken.get('error');
		if (known) throw new RpcError(-32603, known.message);
		if (method === 'chunk.item') {
			const next = state.current + 1;
			if (params.index !== next || next >= contexts.length) {
				throw new RpcError(
					-32602,
					violation(`named item ${String(params.index)}, and the next item is ${next}`).message,
				);
			}
			state.current = next;
			return null;
		}
		if (state.current < 0) {
			throw new RpcError(-32603, violation(`called ${method} before the first item`).message);
		}
		return await calls.calls(method, params);
	};
	const valueAt = valueOf(items);
	const outcomeOf = (outcome: unknown): ItemOutcome => {
		if (!isRecord(outcome) || (outcome.tag !== 'output' && outcome.tag !== 'failed')) {
			throw violation('gave an outcome that is not an item-outcome');
		}
		if (state.given > state.current) {
			throw violation(`gave the outcome of item ${state.given} before the item started`);
		}
		state.given += 1;
		if (outcome.tag === 'failed') return { error: runErrorOf(outcome.val, calls) };
		try {
			return { value: valueAt(outcome.val, calls.hostJson) };
		} catch (error) {
			return { error };
		}
	};
	const stop = connection.serve(served);
	const handles = new Map<'handle', unknown>();
	try {
		const inputs = await Promise.all(
			contexts.map(async ({ input }) => await calls.guestInput(input)),
		);
		const handle = await connection.request('action.chunk-run.[new]', {
			inputs,
			items: items.map(({ json }) => json),
			continueOnFail,
		});
		handles.set('handle', handle);
		for (;;) {
			const taken = await connection.request('action.chunk-run.[take]', {
				self: handle,
				max: TAKE,
			});
			if (!isOutputs(taken)) throw violation('gave no outcomes');
			const outcomes = taken.outputs.map(outcomeOf);
			const known = broken.get('error');
			if (known) throw known;
			yield* outcomes;
			if (taken.error !== undefined) throw runErrorOf(taken.error, calls);
			if (taken.done) return;
		}
	} catch (error) {
		const known = broken.get('error');
		if (known) throw known;
		yield* contexts.slice(state.given).map(() => ({ error }));
	} finally {
		stop();
		calls.close();
		if (handles.has('handle')) {
			connection.notify('action.chunk-run.[drop]', { self: handles.get('handle') });
		}
	}
}

/** The outcomes of a per-item action over many items, in `chunk-run`s of `CHUNK_ITEMS`. */
async function* chunkOutcomesOf(
	manifest: VersionManifest,
	valueOf: (items: readonly InputItem[]) => ReturnType<typeof itemValueOf>,
	contexts: readonly ChunkContext[],
	continueOnFail: boolean,
	start: () => Promise<Connection>,
): AsyncGenerator<ItemOutcome> {
	if (contexts.length === 0) return;
	const shared = sessions.getStore();
	const connection = await (shared ?? start)();
	const slices = Array.from({ length: Math.ceil(contexts.length / CHUNK_ITEMS) }, (_, index) =>
		contexts.slice(index * CHUNK_ITEMS, (index + 1) * CHUNK_ITEMS),
	);
	try {
		for (const slice of slices) {
			yield* chunkRun(manifest, valueOf, slice, continueOnFail, connection);
		}
	} finally {
		if (!shared) connection.close();
	}
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
 * The node of a bundle. The credential types come from the host by the names of the manifest:
 * from the credential manifest, else from `credentialType`. The name, the base URL and the scopes
 * text come from `describe()`. The bundle can name only a base URL on an egress host of its
 * manifest: freeze writes the base URL host there.
 */
async function nodeOf(
	manifest: VersionManifest,
	described: unknown,
	credentialType: SandboxOptions['credentialType'],
	credentialManifestOf: CredentialManifestOf,
): Promise<NodeDefinition> {
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
	const types = await Promise.all(
		contract.credentials.map(async (name): Promise<AnyCredentialType> => {
			const stored = await credentialManifestOf(name);
			const type = stored ? compatTypeOfManifest(stored) : credentialType(name);
			if (!type) {
				throw new UserError(
					`${id}@${semver} uses the credential type ${name}, which n8n does not have`,
				);
			}
			return { ...type, scheme: { kind: 'compat' } };
		}),
	);
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
		const calls = callsOf(() => context, items, contract);
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

/** A value of a webhook request as WIT text: a list gives one pair per entry. */
const pairsOf = (record: Readonly<Record<string, unknown>>): Array<[string, string]> =>
	Object.entries(record).flatMap(([name, value]) =>
		(Array.isArray(value) ? value : [value]).flatMap(
			(entry): Array<[string, string]> =>
				entry === undefined || entry === null
					? []
					: [[name, typeof entry === 'object' ? JSON.stringify(entry) : String(entry)]],
		),
	);

/**
 * One trigger call in the sandbox: the function of the trigger interface, with the host imports
 * of the executor context. So a request of the guest takes the egress of the executor.
 */
async function sandboxedTriggerCall(
	manifest: VersionManifest,
	context: SandboxContext,
	start: () => Promise<Connection>,
): Promise<Record<string, unknown>> {
	const call: TriggerCall = triggerCallOf(context.item?.json);
	const shared = sessions.getStore();
	const connection = await (shared ?? start)();
	const calls = callsOf(() => context, [], manifest.contract);
	const stop = connection.serve(calls.calls);
	const { input } = context;
	const request = async (name: string, params: Record<string, unknown>) =>
		await connection.request(`trigger.${name}`, { input, ...params });
	try {
		switch (call.call) {
			case 'poll': {
				const { state, limit, at } = call;
				const polled = await request('poll', {
					...(state === undefined ? {} : { state }),
					...(limit === undefined ? {} : { limit }),
					at,
				});
				if (!isRecord(polled)) throw new UserError(`${manifest.id} gave no poll result`);
				return { items: polled.items, state: polled.state };
			}
			case 'activate': {
				const { url, secret } = call;
				return { state: await request('activate', { url, ...(secret ? { secret } : {}) }) };
			}
			case 'check':
				return { exists: (await request('check', { state: call.state })) === true };
			case 'deactivate':
				await request('deactivate', { state: call.state });
				return {};
			case 'webhook': {
				const {
					state,
					request: { body, headers, query },
				} = call;
				const items = await request('webhook', {
					...(state === undefined ? {} : { state }),
					request: { headers: pairsOf(headers), query: pairsOf(query), body },
				});
				return { items };
			}
			// Without this branch, TypeScript reports TS2366 for this function.
			default:
				throw new UnexpectedError('The trigger call has no function');
		}
	} catch (error) {
		throw isRecord(error) && isRecord(error.data) ? runErrorOf(error.data, calls) : error;
	} finally {
		stop();
		calls.close();
		if (!shared) connection.close();
	}
}

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
	chunked: boolean,
): Action & { readonly runChunk?: ChunkRunner } {
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
	if (manifest.kind === 'trigger') {
		const call = async (context: SandboxContext) =>
			await sandboxedTriggerCall(manifest, context, start);
		return { ...shell, ...TRIGGER_RUN, run: call };
	}
	const run = (context: SandboxContext): AsyncGenerator<unknown> | Promise<unknown> => {
		if (manifest.kind === 'provider') return providerCapabilityOf(manifest, context, start);
		if (contract.inputs) {
			const given = context.inputs;
			const inputs = isInputLists(given)
				? given
				: 'count' in contract.inputs
					? []
					: contract.inputs.map((name) => given?.[name] ?? []);
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
	const runChunk: ChunkRunner = (contexts, continueOnFail) =>
		chunkOutcomesOf(
			manifest,
			(items) => itemValueOf(shell, items),
			contexts,
			continueOnFail,
			start,
		);
	return { ...shell, run, ...(chunked ? { runChunk } : {}) };
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
	if (kind === 'trigger') {
		return contract.trigger === 'poll' || contract.trigger === 'webhook'
			? undefined
			: `${id} is a native trigger; n8n runs its legacy node`;
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

/** The action of a frozen version in the sandbox, the executor that runs it, and its `migrate`. */
export async function sandboxedVersionOf(
	frozen: FrozenVersion,
	options: SandboxOptions,
	hostRuntime: HostRuntime,
) {
	const { manifest } = frozen;
	const missing = unsupported(manifest);
	if (missing) throw new UserError(missing);
	// The host compiles the contract schemas, so they get the same guards as a schema of the guest.
	const refused =
		frozen.origin === 'first-party'
			? []
			: [
					...validateUntrusted(undefined, manifest.contract.input, { path: 'input' }),
					...validateUntrusted(undefined, manifest.contract.output, { path: 'output' }),
				];
	if (refused.length > 0) {
		throw new UserError(`The contract of ${manifest.id}@${manifest.semver}: ${refused.join('; ')}`);
	}
	const kind: SandboxKind = manifest.kind;
	const code = await verifiedCodeOf(frozen, hostRuntime.nodeContractRange);
	const config: GuestSession = {
		kind,
		limits: { ...DEFAULT_LIMITS, ...options.limits },
		manifest,
		bundleFile: await bundleFileOf(options, manifest, code),
		grants: grantsOf(manifest, chunksItems(manifest, options)),
		cacheDir: options.cacheDir,
	};
	const runtime = runtimeOf(options);
	const start = async (recorder?: RunRecorder) => await openSession(runtime, config, recorder);
	const describing = await start();
	const described = await describing
		.request(`${kind}.describe`, {})
		.finally(() => describing.close());
	if (kind === 'trigger') {
		const webhook = isRecord(described) ? described.webhook : undefined;
		assertWebhookSignature(
			manifest,
			isRecord(webhook) ? webhook.verify : undefined,
			hostRuntime.reportRefusal,
		);
	}
	const action = sandboxedAction(
		manifest,
		await nodeOf(manifest, described, options.credentialType, hostRuntime.credentialManifestOf),
		start,
		chunksItems(manifest, options),
	);
	// Only the action interface exports `migrate`: another kind gives a "method not found" error.
	const migrate = async (fromMajor: number, params: Readonly<Record<string, unknown>>) => {
		const connection = await start();
		const migrated = await connection
			.request(`${kind}.migrate`, { fromMajor, params })
			.finally(() => connection.close());
		if (!isRecord(migrated)) {
			throw new UserError(
				`${manifest.id}@${manifest.semver} migrated to a value that is not an object`,
			);
		}
		return migrated;
	};
	return { action, start, executor: sandboxedExecutor(executorOf(action), start), migrate };
}

/**
 * Compiles the guest of each kind into `cacheDir`, so that the first run in a WASM runtime does
 * not wait for the compile (about 2 s for each guest). It starts one sidecar for each guest
 * without a bundle and stops it after `[initialize]`. The guests compile one after the other to
 * keep the load at start low.
 *
 * @throws when a sidecar cannot start or a guest cannot compile. Then the first run compiles.
 */
export async function warmSandbox(
	options: WasmSidecarOptions & Pick<SandboxOptions, 'cacheDir' | 'limits'>,
): Promise<void> {
	// The sidecar creates a missing cache directory with the umask mode, which others can read.
	await mkdir(options.cacheDir, { recursive: true, mode: 0o700 });
	const limits = { ...DEFAULT_LIMITS, ...options.limits };
	await SANDBOX_KINDS.reduce(async (previous, kind) => {
		await previous;
		const child = await spawnSidecar(options, {
			kind,
			limits,
			grants: [],
			cacheDir: options.cacheDir,
			nodeContract: NODE_CONTRACT_VERSION,
		});
		const connection = connectChild(child, { limits, label: `The ${kind} guest` });
		try {
			await connection.request('[initialize]', { nodeContract: NODE_CONTRACT_VERSION });
		} finally {
			connection.close();
		}
	}, Promise.resolve());
}

function runtimeOf({ runtime, sidecar, guests }: SandboxOptions): GuestRuntime {
	if (runtime) return runtime;
	if (!sidecar || !guests) {
		throw new UnexpectedError('The sandbox needs a runtime, or a sidecar and guests');
	}
	return wasmSidecarRuntime({ sidecar, guests });
}

/** One connection for all runs of one node execution, opened at the first run. */
function sandboxedExecutor(
	executor: Executor,
	start: (recorder?: RunRecorder) => Promise<Connection>,
): Executor {
	return async (host) => {
		const { recorder } = host;
		recorder?.path('sandbox');
		const opened = new Map<'connection', Promise<Connection>>();
		const traced = recorder && {
			...recorder,
			request: (request: RunRequest) => {
				const rpc = guestCalls.getStore();
				recorder.request(rpc === undefined ? request : { ...request, rpc });
			},
			// `[stats]` only measures the run, so the profile does not count it as a message of the run.
			rpc: (rpc: RunRpc) => {
				if (rpc.method !== '[stats]') recorder.rpc(rpc);
			},
		};
		const shared = async () => {
			const connection = opened.get('connection') ?? start(traced);
			opened.set('connection', connection);
			return await connection;
		};
		try {
			return await sessions.run(
				shared,
				async () => await executor(traced ? { ...host, recorder: traced } : host),
			);
		} finally {
			const connection = opened.get('connection');
			const stats = recorder && connection && (await sandboxStatsOf(connection));
			if (stats) recorder.sandbox(stats);
			void connection?.then(
				(session) => session.close(),
				() => undefined,
			);
		}
	};
}

/**
 * What the guest used, from the `[stats]` answer of its runner. A runner that exited, or that does
 * not measure its guest, gives nothing.
 */
async function sandboxStatsOf(
	connection: Promise<Connection>,
): Promise<RunSandboxStats | undefined> {
	try {
		const stats = await (await connection).request('[stats]', {});
		if (!isRecord(stats)) return undefined;
		const { guestCpuMs, memoryPeakBytes, instantiateMs } = stats;
		const isAmount = (value: unknown): value is number =>
			typeof value === 'number' && Number.isFinite(value) && value >= 0;
		return isAmount(guestCpuMs) && isAmount(memoryPeakBytes) && isAmount(instantiateMs)
			? { guestCpuMs, memoryPeakBytes, instantiateMs }
			: undefined;
	} catch {
		return undefined;
	}
}

/**
 * The executor loader of the runtime policy: each version runs in the runtime that
 * `runtimeNameOf` gives for its origin, `in-process` through `loadExecutor`. All runtimes use the
 * same host imports, so the egress, credential and limit checks are the same. A sandboxed version
 * gets its credential types from the credential manifests of the host, else from
 * `options.credentialType`, so it needs no HEAD bundle for them.
 */
export function policyExecutorLoader(
	policy: RuntimePolicy,
	options: SandboxOptions,
): ExecutorLoader {
	return async (frozen, hostRuntime) => {
		const { manifest } = frozen;
		const name = runtimeNameOf(policy, frozen);
		policy.log?.(`${manifest.id}@${manifest.semver} (${frozen.origin}) runs in ${name}`);
		if (name === 'in-process') {
			return manifest.kind === 'trigger'
				? await loadTriggerExecutor(frozen, hostRuntime)
				: await loadExecutor(frozen, hostRuntime);
		}
		const runtime = policy.runtimes[name];
		if (!runtime)
			throw new UnexpectedError(`The ${name} runtime is available, but the host gave none`);
		return (await sandboxedVersionOf(frozen, { ...options, runtime: runtime() }, hostRuntime))
			.executor;
	};
}
