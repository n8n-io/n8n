/**
 * Augmented by the generated `src/n8n-bindings.d.ts` of an app with
 * `workflows: { <key>: { input; output } }` and `tables: { <key>: { row } }`, so keys,
 * inputs and rows are checked at build time. Kept empty here: interface merging rejects
 * a property that is declared twice with different types, so the SDK cannot declare
 * `workflows` or `tables` itself.
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

/** One runtime API call: the JSON body on 2xx, an `N8nAppError` otherwise. */
async function call(
	path: string,
	init: { method: string; body?: unknown; signal?: AbortSignal },
	baseUrl: string | undefined,
): Promise<{ status: number; body: unknown }> {
	const base = (baseUrl ?? defaultBaseUrl()).replace(/\/+$/, '');
	const response = await fetch(`${base}${path}`, {
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
	const body = await readJson(response);

	if (!response.ok) {
		const error = isRecord(body) ? body : {};
		throw new N8nAppError(
			response.status,
			typeof error.code === 'string' ? error.code : 'request_failed',
			typeof error.message === 'string' ? error.message : `Request failed (${response.status})`,
			error.issues,
		);
	}
	return { status: response.status, body };
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

export function createClient(opts: { baseUrl?: string } = {}): N8nAppClient {
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
	};
}

export const n8n: N8nAppClient = createClient();
