import type {
	AgentChatMessagesResponse,
	AgentKey,
	AgentSseEvent,
	MeResponse,
	NewRow,
	Row,
	RunResult,
	RuntimeBinding,
	TableFilter,
	TableKey,
	TableListOptions,
	WorkflowKey,
	Workflows,
} from './types.js';

export type * from './types.js';

/** The app API lives on the app origin, so requests never leave it. */
export const DEFAULT_BASE_URL = '/_n8n/api/v1';
const REQUEST_HEADER = 'x-n8n-app-request';
const POLL_INTERVALS_MS = [500, 1000, 2000, 5000];

export class N8nAppError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
		readonly issues?: unknown,
	) {
		super(message);
		this.name = 'N8nAppError';
	}
}

export interface AgentChatOptions {
	/** Defaults to `sessionId()`. */
	sessionId?: string;
	signal?: AbortSignal;
}

/** One agent turn. The request starts on the first read. A second pass yields nothing. */
export interface AgentChat extends AsyncIterable<AgentSseEvent> {
	/**
	 * Reads the stream and returns the text. Throws `N8nAppError` on an `error`
	 * event, or with code `agent_suspended` when the agent waits for approval.
	 */
	text(): Promise<string>;
}

export interface AgentClient {
	chat(message: string, opts?: AgentChatOptions): AgentChat;
	resume(
		input: { runId: string; toolCallId: string; resumeData: unknown },
		opts?: AgentChatOptions,
	): AgentChat;
	messages(sessionId?: string, opts?: { signal?: AbortSignal }): Promise<AgentChatMessagesResponse>;
	/** The visitor's session for this agent. It survives a reload. */
	sessionId(): string;
	/** Starts a new conversation and returns its session ID. */
	newSession(): string;
}

export interface TableClient<K extends TableKey> {
	list(opts?: TableListOptions<K>): Promise<{ count: number; data: Array<Row<K>> }>;
	insert(rows: Array<NewRow<K>>, opts?: { signal?: AbortSignal }): Promise<{ data: Array<Row<K>> }>;
	update(
		filter: TableFilter<K>,
		data: NewRow<K>,
		opts?: { signal?: AbortSignal },
	): Promise<{ data: Array<Row<K>> }>;
	delete(filter: TableFilter<K>, opts?: { signal?: AbortSignal }): Promise<{ data: Array<Row<K>> }>;
}

export interface WorkflowRunOptions {
	signal?: AbortSignal;
	/** When `false`, a run that takes long returns at once with status `running`. */
	wait?: boolean;
}

export interface WorkflowClient<K extends WorkflowKey> {
	run(
		input?: Workflows[K]['input'],
		opts?: WorkflowRunOptions,
	): Promise<RunResult<Workflows[K]['output']>>;
	/** Reads a run that `run` returned with status `running`. */
	getRun(
		executionId: string,
		opts?: { signal?: AbortSignal },
	): Promise<RunResult<Workflows[K]['output']>>;
}

export interface N8nAppClient {
	me(opts?: { signal?: AbortSignal }): Promise<MeResponse>;
	bindings(opts?: { signal?: AbortSignal }): Promise<RuntimeBinding[]>;
	workflows: { [K in WorkflowKey]: WorkflowClient<K> };
	tables: { [K in TableKey]: TableClient<K> };
	agents: { [K in AgentKey]: AgentClient };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}

const invalidResponse = (status: number) =>
	new N8nAppError(status, 'invalid_response', 'The app API returned an unexpected response.');

function expect<T>(guard: (value: unknown) => value is T) {
	return ({ status, body }: { status: number; body: unknown }): T => {
		if (!guard(body)) throw invalidResponse(status);
		return body;
	};
}

const isRunResult = <T>(value: unknown): value is RunResult<T> =>
	isRecord(value) && typeof value.executionId === 'string' && typeof value.status === 'string';
const isRowList = <R>(value: unknown): value is { data: R[] } =>
	isRecord(value) && Array.isArray(value.data);
const isRowPage = <R>(value: unknown): value is { count: number; data: R[] } =>
	isRecord(value) && Array.isArray(value.data) && typeof value.count === 'number';
const isMe = (value: unknown): value is MeResponse => isRecord(value) && 'user' in value;
const isBindingList = (value: unknown): value is RuntimeBinding[] => Array.isArray(value);
const isMessages = (value: unknown): value is AgentChatMessagesResponse =>
	isRecord(value) && Array.isArray(value.messages) && Array.isArray(value.openSuspensions);
const isSseEvent = (value: unknown): value is AgentSseEvent =>
	isRecord(value) && typeof value.type === 'string';

/** Backs off between polls of a long workflow run. The SDK ships without dependencies. */
async function waitBeforePoll(attempt: number, signal?: AbortSignal) {
	signal?.throwIfAborted();
	const ms = POLL_INTERVALS_MS[Math.min(attempt, POLL_INTERVALS_MS.length - 1)];
	await new Promise<void>((resolve, reject) => {
		const onAbort = () => {
			clearTimeout(timer);
			reject(new DOMException('The run was aborted.', 'AbortError'));
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		signal?.addEventListener('abort', onAbort, { once: true });
	});
}

/** A v4 UUID. `crypto.randomUUID` exists only in secure contexts. */
function uuid(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function* readSseEvents(response: Response): AsyncGenerator<AgentSseEvent> {
	if (!response.body) return;
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			for (const line of lines) {
				// `:ok` and `:ping` comments, blank lines, and lines that do not parse are skipped.
				if (!line.startsWith('data: ')) continue;
				let event: unknown;
				try {
					event = JSON.parse(line.slice(6));
				} catch {
					continue;
				}
				if (isSseEvent(event)) yield event;
			}
		}
	} finally {
		// A consumer that stops early must also close the HTTP body.
		await reader.cancel().catch(() => undefined);
	}
}

function agentChat(start: () => Promise<Response>): AgentChat {
	let events: AsyncGenerator<AgentSseEvent> | undefined;
	const stream = async function* () {
		yield* readSseEvents(await start());
	};
	const chat: AgentChat = {
		[Symbol.asyncIterator]: () => (events ??= stream()),
		async text() {
			let text = '';
			for await (const event of chat) {
				if (event.type === 'text-delta') text += event.delta;
				if (event.type === 'error') {
					throw new N8nAppError(200, event.errorCode ?? 'execution_failed', event.message);
				}
				if (event.type === 'tool-call-suspended') {
					throw new N8nAppError(
						200,
						'agent_suspended',
						'The agent waits for an answer. Read the chat stream to show and resume it.',
						event.payload,
					);
				}
			}
			return text;
		},
	};
	return chat;
}

/** Keeps agent sessions across reloads. Falls back to memory when storage is blocked. */
function sessionStore() {
	const memory = new Map<string, string>();
	return {
		get(key: string): string | null {
			try {
				return localStorage.getItem(key) ?? memory.get(key) ?? null;
			} catch {
				return memory.get(key) ?? null;
			}
		},
		set(key: string, value: string) {
			memory.set(key, value);
			try {
				localStorage.setItem(key, value);
			} catch {
				// The memory copy keeps the session for this page.
			}
		},
	};
}

/** Clients keyed by binding key, so `n8n.tables.tasks` needs no registration step. */
function keyedProxy<V>(create: (key: string) => V): Record<string, V> {
	const cache = new Map<string, V>();
	return new Proxy<Record<string, V>>(
		{},
		{
			get: (_target, key) => {
				// `then` keeps the proxy from looking like a promise to `await`.
				if (typeof key !== 'string' || key === 'then') return undefined;
				let client = cache.get(key);
				if (!client) {
					client = create(key);
					cache.set(key, client);
				}
				return client;
			},
		},
	);
}

export function createClient(opts: { baseUrl?: string } = {}): N8nAppClient {
	const baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
	const sessions = sessionStore();

	async function request(
		path: string,
		init: { method: string; body?: unknown; signal?: AbortSignal },
	): Promise<Response> {
		const headers: Record<string, string> = { [REQUEST_HEADER]: '1' };
		if (init.body !== undefined) headers['Content-Type'] = 'application/json';
		const response = await fetch(`${baseUrl}${path}`, {
			method: init.method,
			headers,
			credentials: 'same-origin',
			body: init.body === undefined ? undefined : JSON.stringify(init.body),
			signal: init.signal,
		}).catch((error: unknown) => {
			if (init.signal?.aborted) throw error;
			throw new N8nAppError(0, 'request_failed', 'The request did not reach n8n.');
		});
		if (!response.ok) {
			const body = await readJson(response);
			const error = isRecord(body) ? body : {};
			throw new N8nAppError(
				response.status,
				typeof error.code === 'string' ? error.code : 'request_failed',
				typeof error.message === 'string' ? error.message : `Request failed (${response.status})`,
				error.issues,
			);
		}
		return response;
	}

	async function call(
		path: string,
		init: { method: string; body?: unknown; signal?: AbortSignal },
	) {
		const response = await request(path, init);
		return { status: response.status, body: await readJson(response) };
	}

	function workflowClient(key: string): WorkflowClient<WorkflowKey> {
		const base = `/workflows/${encodeURIComponent(key)}`;
		const getRun = async (executionId: string, runOpts?: { signal?: AbortSignal }) =>
			expect(isRunResult)(
				await call(`${base}/runs/${encodeURIComponent(executionId)}`, {
					method: 'GET',
					signal: runOpts?.signal,
				}),
			);
		return {
			async run(input, runOpts = {}) {
				let result = expect(isRunResult)(
					await call(`${base}/run`, { method: 'POST', body: input ?? {}, signal: runOpts.signal }),
				);
				for (let attempt = 0; result.status === 'running' && runOpts.wait !== false; attempt++) {
					await waitBeforePoll(attempt, runOpts.signal);
					result = await getRun(result.executionId, runOpts);
				}
				return result;
			},
			getRun,
		};
	}

	function tableClient(key: string): TableClient<TableKey> {
		const rows = `/tables/${encodeURIComponent(key)}/rows`;
		return {
			async list(listOpts = {}) {
				const search = new URLSearchParams();
				if (listOpts.filter) search.set('filter', JSON.stringify(listOpts.filter));
				if (listOpts.search !== undefined) search.set('search', listOpts.search);
				if (listOpts.sortBy !== undefined) search.set('sortBy', listOpts.sortBy);
				if (listOpts.take !== undefined) search.set('take', String(listOpts.take));
				if (listOpts.skip !== undefined) search.set('skip', String(listOpts.skip));
				const query = search.toString();
				return expect(isRowPage<Row<TableKey>>)(
					await call(query ? `${rows}?${query}` : rows, { method: 'GET', signal: listOpts.signal }),
				);
			},
			async insert(data, writeOpts) {
				return expect(isRowList<Row<TableKey>>)(
					await call(rows, { method: 'POST', body: { data }, signal: writeOpts?.signal }),
				);
			},
			async update(filter, data, writeOpts) {
				return expect(isRowList<Row<TableKey>>)(
					await call(rows, { method: 'PATCH', body: { filter, data }, signal: writeOpts?.signal }),
				);
			},
			async delete(filter, writeOpts) {
				return expect(isRowList<Row<TableKey>>)(
					await call(`${rows}/delete`, {
						method: 'POST',
						body: { filter },
						signal: writeOpts?.signal,
					}),
				);
			},
		};
	}

	function agentClient(key: string): AgentClient {
		const base = `/agents/${encodeURIComponent(key)}`;
		const storageKey = `n8n-app:agent:${key}:session`;
		const newSession = () => {
			const id = uuid();
			sessions.set(storageKey, id);
			return id;
		};
		const sessionId = () => sessions.get(storageKey) ?? newSession();
		return {
			chat: (message, chatOpts) =>
				agentChat(
					async () =>
						await request(`${base}/chat`, {
							method: 'POST',
							body: { message, sessionId: chatOpts?.sessionId ?? sessionId() },
							signal: chatOpts?.signal,
						}),
				),
			resume: (input, chatOpts) =>
				agentChat(
					async () =>
						await request(`${base}/chat/resume`, {
							method: 'POST',
							body: { ...input, sessionId: chatOpts?.sessionId ?? sessionId() },
							signal: chatOpts?.signal,
						}),
				),
			async messages(explicitSessionId, readOpts) {
				const id = encodeURIComponent(explicitSessionId ?? sessionId());
				return expect(isMessages)(
					await call(`${base}/messages?sessionId=${id}`, {
						method: 'GET',
						signal: readOpts?.signal,
					}),
				);
			},
			sessionId,
			newSession,
		};
	}

	return {
		me: async (meOpts) =>
			expect(isMe)(await call('/me', { method: 'GET', signal: meOpts?.signal })),
		bindings: async (bindingOpts) =>
			expect(isBindingList)(
				await call('/bindings', { method: 'GET', signal: bindingOpts?.signal }),
			),
		workflows: keyedProxy(workflowClient),
		tables: keyedProxy(tableClient),
		agents: keyedProxy(agentClient),
	};
}

export const n8n: N8nAppClient = createClient();
