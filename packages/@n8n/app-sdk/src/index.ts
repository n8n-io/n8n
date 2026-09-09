/**
 * Augmented by the generated `src/n8n-bindings.d.ts` of an app with
 * `workflows: { <key>: { input; output } }`, so `run` keys and inputs are checked at
 * build time. Kept empty here: interface merging rejects a property that is declared
 * twice with different types, so the SDK cannot declare `workflows` itself.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Bindings {}

type AnyWorkflows = Record<string, { input: unknown; output: unknown }>;
type Workflows = Bindings extends { workflows: infer W extends AnyWorkflows } ? W : AnyWorkflows;
type WorkflowKey = Extract<keyof Workflows, string>;

/** The signed-in visitor of an app with `authMode: 'n8n'`; `null` for a public app. */
export type Principal = { userId: string } | null;

export interface RunResult<T> {
	executionId: string;
	status: 'success' | 'error' | 'waiting' | 'canceled' | 'running' | 'unknown';
	output?: T;
	/** Set when the response was binary data, which v1 does not return; `output` is then `null`. */
	outputTruncated?: true;
	error?: string;
	principal: Principal;
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRunResult<T>(value: unknown): value is RunResult<T> {
	return (
		isRecord(value) && typeof value.executionId === 'string' && typeof value.status === 'string'
	);
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

const PAGE_TOKEN_META_NAME = 'n8n-app-token';

/** n8n puts the page token into the served `index.html`; every call sends it back. */
function pageToken(): string | undefined {
	if (typeof document === 'undefined') return undefined;
	return (
		document.querySelector(`meta[name="${PAGE_TOKEN_META_NAME}"]`)?.getAttribute('content') ??
		undefined
	);
}

// A 401 for a call that sent a token means it expired (15 min): a fresh navigation re-mints
// it, and for an `n8n` app the cookie or the OAuth flow signs the visitor in again. Without a
// token the page was not served by n8n (a dev preview), and a reload would change nothing.
// Once per page load, so a server that keeps answering 401 cannot loop the page. The call
// still rejects, because the reload is asynchronous and the caller's error handling must not
// hang on it.
let reloadedOnce = false;

function reloadOnce(): void {
	if (reloadedOnce || typeof location === 'undefined') return;
	reloadedOnce = true;
	location.reload();
}

export function createClient(opts: { baseUrl?: string } = {}): N8nAppClient {
	return {
		workflows: {
			async run(key, input, runOpts) {
				const baseUrl = (opts.baseUrl ?? defaultBaseUrl()).replace(/\/+$/, '');
				const token = pageToken();
				const response = await fetch(`${baseUrl}/workflows/${encodeURIComponent(key)}`, {
					method: 'POST',
					headers: [
						['Content-Type', 'application/json'],
						...(token ? [['Authorization', `Bearer ${token}`] as [string, string]] : []),
					],
					body: JSON.stringify(input ?? {}),
					signal: runOpts?.signal,
				}).catch((error: unknown) => {
					// A 429 from the rate limiter carries no CORS headers, so the browser reports it
					// as a network error. The caller's own abort stays an AbortError.
					if (runOpts?.signal?.aborted) throw error;
					throw new N8nAppError(
						0,
						'request_failed',
						'The request did not reach n8n: network error, or a rate-limited response the browser could not read.',
					);
				});
				const body = await readJson(response);

				if (response.status === 401 && token) reloadOnce();
				if (!response.ok) {
					const error = isRecord(body) ? body : {};
					throw new N8nAppError(
						response.status,
						typeof error.code === 'string' ? error.code : 'request_failed',
						typeof error.message === 'string'
							? error.message
							: `Request failed (${response.status})`,
						error.issues,
					);
				}
				if (!isRunResult<Workflows[typeof key]['output']>(body)) {
					throw new N8nAppError(response.status, 'invalid_response', 'Unexpected response body');
				}
				return body;
			},
		},
	};
}

export const n8n: N8nAppClient = createClient();
