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

export interface RunResult<T> {
	executionId: string;
	status: 'success' | 'error' | 'waiting' | 'canceled' | 'running';
	output?: T;
	error?: string;
	principal: null;
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

// Vite sets BASE_URL to the app's base path ('/apps/<ns>/'). Without a bundler, the
// served page lives at /apps/<ns>/..., so the namespace is the second path segment.
function defaultBaseUrl(): string {
	const viteBase = import.meta.env?.BASE_URL;
	if (viteBase !== undefined) return `${viteBase}api`;
	const [root, namespace] = location.pathname.split('/').filter(Boolean);
	return `/${root}/${namespace}/api`;
}

export function createClient(opts: { baseUrl?: string } = {}): N8nAppClient {
	const baseUrl = (opts.baseUrl ?? defaultBaseUrl()).replace(/\/+$/, '');

	return {
		workflows: {
			async run(key, input, opts) {
				const response = await fetch(`${baseUrl}/workflows/${encodeURIComponent(key)}`, {
					method: 'POST',
					headers: [['Content-Type', 'application/json']],
					body: JSON.stringify(input ?? {}),
					signal: opts?.signal,
				});
				const body = await readJson(response);

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
