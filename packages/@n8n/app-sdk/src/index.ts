/**
 * Augmented by the generated `src/n8n-bindings.d.ts` of an app with
 * `workflows: { <key>: { input; output } }`, `tables: { <key>: { row } }` and
 * `agents: { <key>: {...} }`, so keys, inputs and rows are checked at build time. Kept
 * empty here: interface merging rejects a property that is declared twice with different
 * types, so the SDK cannot declare `workflows`, `tables` or `agents` itself.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Bindings {}

type AnyWorkflows = Record<string, { input: unknown; output: unknown }>;
type Workflows = Bindings extends { workflows: infer W extends AnyWorkflows } ? W : AnyWorkflows;
type WorkflowKey = Extract<keyof Workflows, string>;

type AnyTables = Record<string, { row: Record<string, unknown> }>;
type Tables = Bindings extends { tables: infer T extends AnyTables } ? T : AnyTables;
type TableKey = Extract<keyof Tables, string>;
type Row<K extends TableKey> = Tables[K]['row'];
/** What the app sends: the server fills `id`, `createdAt` and `updatedAt`. */
type NewRow<K extends TableKey> = Partial<Omit<Row<K>, 'id' | 'createdAt' | 'updatedAt'>>;
type ColumnName<K extends TableKey> = Extract<keyof Row<K>, string>;

type AnyAgents = Record<string, unknown>;
type Agents = Bindings extends { agents: infer A extends AnyAgents } ? A : AnyAgents;
type AgentKey = Extract<keyof Agents, string>;

/** Every app is public, so the visitor is anonymous. Reserved for a signed-in visitor later. */
export type Principal = null;

export interface RunResult<T> {
	executionId: string;
	status: 'success' | 'error' | 'waiting' | 'canceled' | 'running' | 'unknown';
	output?: T;
	/** Set when the response was binary data, which v1 does not return; `output` is then `null`. */
	outputTruncated?: true;
	error?: string;
	principal: Principal;
}

/** Same shape as the n8n REST data table filter; `type` defaults to `and`, `condition` to `eq`. */
export interface TableFilter<K extends TableKey = TableKey> {
	type?: 'and' | 'or';
	filters: Array<{
		columnName: ColumnName<K>;
		condition?: 'eq' | 'neq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';
		value: string | number | boolean | null;
	}>;
}

export interface TableListOptions<K extends TableKey> {
	filter?: TableFilter<K>;
	/** Case-insensitive substring match over every column as text. */
	search?: string;
	sortBy?: `${ColumnName<K>}:${'asc' | 'desc'}`;
	/** Default 10, at most 250. */
	take?: number;
	skip?: number;
}

// Wire types of the agent chat routes. Structural mirror of `@n8n/api-types`
// (`agent-sse.ts`, `agents/types.ts`): the SDK ships without dependencies.

export interface ToolSuspendedPayload {
	toolCallId: string;
	/** Echoed back on `resume`. */
	runId: string;
	/** Discriminator of `input`: an approval carries `input: { type: 'approval', toolName, displayName?, args }`. */
	toolName: string;
	input: unknown;
}

export interface AgentSseMessage {
	role: string;
	content: AgentPersistedMessageContentPart[];
}

export type ForwardedChildChunkWire =
	| { type: 'text-delta'; id: string; delta: string }
	| { type: 'reasoning-start'; id: string }
	| { type: 'reasoning-delta'; id: string; delta: string }
	| { type: 'reasoning-end'; id: string }
	| { type: 'tool-input-start'; toolCallId: string; toolName: string }
	| { type: 'tool-execution-start'; toolCallId: string; toolName: string; startTime: number }
	| {
			type: 'tool-execution-end';
			toolCallId: string;
			toolName: string;
			isError: boolean;
			endTime: number;
	  };

/** One `data:` line of the chat stream. A turn ends with `done` or `tool-call-suspended`. */
export type AgentSseEvent =
	| { type: 'start-step' }
	| { type: 'finish-step' }
	| { type: 'text-start'; id: string }
	| { type: 'text-delta'; id: string; delta: string }
	| { type: 'text-end'; id: string }
	| { type: 'reasoning-start'; id: string }
	| { type: 'reasoning-delta'; id: string; delta: string }
	| { type: 'reasoning-end'; id: string }
	| { type: 'tool-input-start'; toolCallId: string; toolName: string }
	| { type: 'tool-input-delta'; toolCallId: string; delta: string }
	| { type: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
	| { type: 'tool-execution-start'; toolCallId: string; toolName: string; startTime: number }
	| {
			type: 'tool-execution-end';
			toolCallId: string;
			toolName: string;
			isError: boolean;
			endTime: number;
	  }
	| {
			type: 'tool-result';
			toolCallId: string;
			toolName: string;
			output: unknown;
			isError?: boolean;
			canceled?: boolean;
	  }
	| { type: 'tool-call-suspended'; payload: ToolSuspendedPayload }
	| {
			type: 'subagent-chunk';
			parentToolCallId: string;
			taskPath: string;
			chunk: ForwardedChildChunkWire;
	  }
	| { type: 'message'; message: AgentSseMessage }
	| { type: 'warning'; message: string; code?: string; source?: 'mcp'; server?: string }
	| { type: 'error'; message: string; errorCode?: string; missing?: string[] }
	| { type: 'done'; sessionId?: string; executionId?: string };

export interface PersistedChildTraceSegment {
	id: string;
	content: string;
	startTime?: number;
	endTime?: number;
}

export interface PersistedChildTraceStep {
	toolCallId: string;
	toolName: string;
	running: boolean;
}

export interface PersistedChildTrace {
	text: string;
	reasoningSegments: PersistedChildTraceSegment[];
	steps: PersistedChildTraceStep[];
}

export interface AgentPersistedMessageContentPart {
	type: 'text' | 'reasoning' | 'tool-call' | 'file' | (string & {});
	text?: string;
	toolName?: string;
	toolCallId?: string;
	input?: unknown;
	suspendPayload?: unknown;
	state?: string;
	output?: unknown;
	canceled?: boolean;
	error?: string;
	startTime?: number;
	endTime?: number;
	fileId?: string;
	fileName?: string;
	mimeType?: string;
	sizeBytes?: number;
	childTrace?: PersistedChildTrace;
}

export interface AgentPersistedMessageDto {
	id: string;
	role: 'user' | 'assistant' | (string & {});
	content: AgentPersistedMessageContentPart[];
	executionId?: string;
	executionStatus?: 'running' | 'success' | 'error' | 'cancelled' | 'interrupted';
}

/** A suspended tool call that still waits for `resume`, for example an approval. */
export interface AgentBuilderOpenSuspension {
	toolCallId: string;
	runId: string;
	suspendPayload?: unknown;
}

export interface AgentChatMessagesResponse {
	messages: AgentPersistedMessageDto[];
	openSuspensions: AgentBuilderOpenSuspension[];
}

export interface AgentChatOptions {
	/** Defaults to `sessionId()`. */
	sessionId?: string;
	signal?: AbortSignal;
}

/** One turn of the agent. The request starts on the first read; a second pass yields nothing. */
export interface AgentChat extends AsyncIterable<AgentSseEvent> {
	/** Drains the stream and returns the `text-delta` deltas joined. */
	text(): Promise<string>;
}

export interface AgentClient {
	chat(message: string, opts?: AgentChatOptions): AgentChat;
	resume(
		input: { runId: string; toolCallId: string; resumeData: unknown },
		opts?: AgentChatOptions,
	): AgentChat;
	messages(sessionId?: string, opts?: { signal?: AbortSignal }): Promise<AgentChatMessagesResponse>;
	/** The visitor's session for this agent, minted once and kept in `localStorage`. */
	sessionId(): string;
}

export interface TableClient<K extends TableKey> {
	list(
		opts?: TableListOptions<K> & { signal?: AbortSignal },
	): Promise<{ count: number; data: Array<Row<K>> }>;
	insert(rows: Array<NewRow<K>>, opts?: { signal?: AbortSignal }): Promise<{ data: Array<Row<K>> }>;
	update(
		filter: TableFilter<K>,
		data: NewRow<K>,
		opts?: { signal?: AbortSignal },
	): Promise<{ data: Array<Row<K>> }>;
	delete(filter: TableFilter<K>, opts?: { signal?: AbortSignal }): Promise<{ data: Array<Row<K>> }>;
}

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

export interface N8nAppClient {
	workflows: {
		run<K extends WorkflowKey>(
			key: K,
			input?: Workflows[K]['input'],
			opts?: { signal?: AbortSignal },
		): Promise<RunResult<Workflows[K]['output']>>;
	};
	tables: { [K in TableKey]: TableClient<K> };
	agents: { [K in AgentKey]: AgentClient };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRunResult<T>(value: unknown): value is RunResult<T> {
	return (
		isRecord(value) && typeof value.executionId === 'string' && typeof value.status === 'string'
	);
}

function isRowList<R>(value: unknown): value is { data: R[] } {
	return isRecord(value) && Array.isArray(value.data);
}

function isRowPage<R>(value: unknown): value is { count: number; data: R[] } {
	return isRecord(value) && Array.isArray(value.data) && typeof value.count === 'number';
}

function isAgentSseEvent(value: unknown): value is AgentSseEvent {
	return isRecord(value) && typeof value.type === 'string';
}

function isMessagesResponse(value: unknown): value is AgentChatMessagesResponse {
	return isRecord(value) && Array.isArray(value.messages) && Array.isArray(value.openSuspensions);
}

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}

// A dev preview serves the app under another prefix and injects VITE_N8N_API_BASE to
// still reach `/apps/<ns>/api`. Otherwise Vite sets BASE_URL to the app's base path
// ('/apps/<ns>/'). Without a bundler, the served page lives at /apps/<ns>/..., so the
// namespace is the second path segment. Resolved per call, not at import: the default
// client is created at import time, also under Jest or a prerender without `location`.
function defaultBaseUrl(): string {
	const apiBase = import.meta.env?.VITE_N8N_API_BASE;
	if (apiBase !== undefined) return apiBase;
	const viteBase = import.meta.env?.BASE_URL;
	if (viteBase !== undefined) return `${viteBase}api`;
	if (typeof location === 'undefined') {
		throw new N8nAppError(
			0,
			'no_base_url',
			'No base URL: pass baseUrl to createClient outside a browser or Vite build.',
		);
	}
	const [root, namespace] = location.pathname.split('/').filter(Boolean);
	return `/${root}/${namespace}/api`;
}

const resolveBaseUrl = (baseUrl: string | undefined) =>
	(baseUrl ?? defaultBaseUrl()).replace(/\/+$/, '');

/** One runtime API request: the 2xx response, an `N8nAppError` otherwise. */
async function request(
	path: string,
	init: { method: string; body?: unknown; signal?: AbortSignal },
	baseUrl: string | undefined,
): Promise<Response> {
	const response = await fetch(`${resolveBaseUrl(baseUrl)}${path}`, {
		method: init.method,
		headers: [['Content-Type', 'application/json']],
		body: init.body === undefined ? undefined : JSON.stringify(init.body),
		signal: init.signal,
	}).catch((error: unknown) => {
		// A 429 from the rate limiter carries no CORS headers, so the browser reports it
		// as a network error. The caller's own abort stays an AbortError.
		if (init.signal?.aborted) throw error;
		throw new N8nAppError(
			0,
			'request_failed',
			'The request did not reach n8n: network error, or a rate-limited response the browser could not read.',
		);
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

/** One runtime API call: the JSON body on 2xx, an `N8nAppError` otherwise. */
async function call(
	path: string,
	init: { method: string; body?: unknown; signal?: AbortSignal },
	baseUrl: string | undefined,
): Promise<{ status: number; body: unknown }> {
	const response = await request(path, init, baseUrl);
	return { status: response.status, body: await readJson(response) };
}

// Mirrors the editor's reader (useAgentChatStream.ts): only `data: ` lines carry an
// event; `:ok` / `:ping` comments, blank lines and unparsable lines are skipped.
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
				if (!line.startsWith('data: ')) continue;
				let event: unknown;
				try {
					event = JSON.parse(line.slice(6));
				} catch {
					continue;
				}
				if (isAgentSseEvent(event)) yield event;
			}
		}
	} finally {
		reader.releaseLock();
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
			}
			return text;
		},
	};
	return chat;
}

const invalidResponse = (status: number) =>
	new N8nAppError(status, 'invalid_response', 'Unexpected response body');

function tableClient<K extends TableKey>(key: K, baseUrl: string | undefined): TableClient<K> {
	const rows = `/tables/${encodeURIComponent(key)}/rows`;
	const query = (params: Record<string, string | undefined>) => {
		const search = new URLSearchParams();
		for (const [name, value] of Object.entries(params)) {
			if (value !== undefined) search.set(name, value);
		}
		const encoded = search.toString();
		return encoded ? `?${encoded}` : '';
	};
	return {
		async list(opts = {}) {
			const path =
				rows +
				query({
					filter: opts.filter && JSON.stringify(opts.filter),
					search: opts.search,
					sortBy: opts.sortBy,
					take: opts.take === undefined ? undefined : String(opts.take),
					skip: opts.skip === undefined ? undefined : String(opts.skip),
				});
			const { status, body } = await call(path, { method: 'GET', signal: opts.signal }, baseUrl);
			if (!isRowPage<Row<K>>(body)) throw invalidResponse(status);
			return body;
		},
		async insert(data, opts) {
			const { status, body } = await call(
				rows,
				{ method: 'POST', body: { data }, signal: opts?.signal },
				baseUrl,
			);
			if (!isRowList<Row<K>>(body)) throw invalidResponse(status);
			return body;
		},
		async update(filter, data, opts) {
			const { status, body } = await call(
				rows,
				{ method: 'PATCH', body: { filter, data }, signal: opts?.signal },
				baseUrl,
			);
			if (!isRowList<Row<K>>(body)) throw invalidResponse(status);
			return body;
		},
		async delete(filter, opts) {
			const path = rows + query({ filter: JSON.stringify(filter) });
			const { status, body } = await call(
				path,
				{ method: 'DELETE', signal: opts?.signal },
				baseUrl,
			);
			if (!isRowList<Row<K>>(body)) throw invalidResponse(status);
			return body;
		},
	};
}

function agentClient(key: string, baseUrl: string | undefined): AgentClient {
	const routes = {
		chat: `/agents/${encodeURIComponent(key)}/chat`,
		resume: `/agents/${encodeURIComponent(key)}/chat/resume`,
		messages: (sessionId: string) =>
			`/agents/${encodeURIComponent(key)}/messages?sessionId=${encodeURIComponent(sessionId)}`,
	};
	// A visitor blocked from localStorage (privacy mode, sandboxed iframe) keeps one
	// session for the page's lifetime.
	let unstoredSessionId: string | undefined;
	const sessionId = () => {
		// The base URL always ends in `/apps/<namespace>/api`.
		const segments = resolveBaseUrl(baseUrl).split('/').filter(Boolean);
		const namespace = segments[segments.length - 2] ?? '';
		const storageKey = `n8n-app:${namespace}:agent:${key}:session`;
		try {
			const stored = localStorage.getItem(storageKey);
			if (stored) return stored;
			const minted = crypto.randomUUID();
			localStorage.setItem(storageKey, minted);
			return minted;
		} catch {
			unstoredSessionId ??= crypto.randomUUID();
			return unstoredSessionId;
		}
	};
	return {
		chat: (message, opts) =>
			agentChat(
				async () =>
					await request(
						routes.chat,
						{
							method: 'POST',
							body: { message, sessionId: opts?.sessionId ?? sessionId() },
							signal: opts?.signal,
						},
						baseUrl,
					),
			),
		resume: (input, opts) =>
			agentChat(
				async () =>
					await request(
						routes.resume,
						{
							method: 'POST',
							body: {
								sessionId: opts?.sessionId ?? sessionId(),
								runId: input.runId,
								toolCallId: input.toolCallId,
								resumeData: input.resumeData,
							},
							signal: opts?.signal,
						},
						baseUrl,
					),
			),
		async messages(explicitSessionId, opts) {
			const { status, body } = await call(
				routes.messages(explicitSessionId ?? sessionId()),
				{ method: 'GET', signal: opts?.signal },
				baseUrl,
			);
			if (!isMessagesResponse(body)) throw invalidResponse(status);
			return body;
		},
		sessionId,
	};
}

export function createClient(opts: { baseUrl?: string } = {}): N8nAppClient {
	// One client per agent key, so the unstored session fallback survives property access.
	const agentClients = new Map<string, AgentClient>();
	return {
		workflows: {
			async run(key, input, runOpts) {
				const { status, body } = await call(
					`/workflows/${encodeURIComponent(key)}`,
					{ method: 'POST', body: input ?? {}, signal: runOpts?.signal },
					opts.baseUrl,
				);
				if (!isRunResult<Workflows[typeof key]['output']>(body)) throw invalidResponse(status);
				return body;
			},
		},
		// Keyed by binding key, so `n8n.tables.tasks` needs no registration step.
		tables: new Proxy<N8nAppClient['tables']>(
			{},
			{
				get: (_target, key) =>
					typeof key === 'string' ? tableClient(key, opts.baseUrl) : undefined,
			},
		),
		agents: new Proxy<N8nAppClient['agents']>(
			{},
			{
				get: (_target, key) => {
					if (typeof key !== 'string') return undefined;
					let client = agentClients.get(key);
					if (!client) {
						client = agentClient(key, opts.baseUrl);
						agentClients.set(key, client);
					}
					return client;
				},
			},
		),
	};
}

export const n8n: N8nAppClient = createClient();
