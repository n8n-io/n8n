import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';

import type { Action, CredentialDefinition, Http, HttpRequest } from './define';
import { validate } from './validate';

export interface RunActionOptions {
	readonly input: unknown;
	readonly credential?: { readonly type: string; readonly data: Record<string, unknown> };
	/** The credential types to look up `credential.type` in. */
	readonly credentials?: readonly CredentialDefinition[];
	/** Defaults to the global `fetch`. Pass `mockHttp(...)` in unit tests. */
	readonly fetch?: typeof fetch;
}

export interface RunActionError {
	readonly message: string;
	/** The first failing field, e.g. `input.limit` or `output[0].id`. */
	readonly path?: string;
	readonly httpStatus?: number;
}

export type RunActionResult =
	| { readonly ok: true; readonly items: unknown[] }
	| { readonly ok: false; readonly error: RunActionError };

class HttpError extends Error {
	constructor(
		message: string,
		readonly httpStatus: number,
	) {
		super(message);
	}
}

const asText = (value: unknown) =>
	typeof value === 'string' ? value : (JSON.stringify(value) ?? '');

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

// Credential data is parsed JSON, so every value is a valid credential value.
const isCredentialData = (
	value: Record<string, unknown>,
): value is ICredentialDataDecryptedObject =>
	Object.values(value).every((entry) => entry !== undefined);

/** The n8n expression `={{$credentials.x}}`, for the one form credential templates use. */
function resolveTemplate<V>(
	template: V,
	credential: CredentialDefinition,
	data: IDataObject,
): V | string {
	if (typeof template !== 'string' || !template.startsWith('=')) return template;
	const resolved = template
		.slice(1)
		.replace(/\{\{\s*\$credentials\.(\w+)\s*\}\}/g, (_, field: string) =>
			asText(data[field] ?? ''),
		);
	if (resolved.includes('{{')) {
		throw new Error(
			`Credential ${credential.name}: only {{$credentials.<field>}} runs outside n8n: ${template}`,
		);
	}
	return resolved;
}

/** Does what n8n's `httpRequestWithAuthentication` does for the credential forms `defineCredential` makes. */
async function authenticate(
	credential: CredentialDefinition,
	data: ICredentialDataDecryptedObject,
	options: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const auth = credential.authenticate;
	if (!auth) return options;
	if (typeof auth === 'function') return await auth(data, options);
	const resolve = (values: IDataObject | undefined) =>
		Object.fromEntries(
			Object.entries(values ?? {}).map(([key, value]) => [
				key,
				resolveTemplate(value, credential, data),
			]),
		);
	return {
		...options,
		headers: { ...options.headers, ...resolve(auth.properties.headers) },
		qs: { ...options.qs, ...resolve(auth.properties.qs) },
	};
}

async function send(fetchFn: typeof fetch, options: IHttpRequestOptions, fullResponse: boolean) {
	const url = new URL(options.url);
	Object.entries(options.qs ?? {})
		.filter(([, value]) => value !== undefined && value !== null)
		.forEach(([key, value]) => url.searchParams.append(key, asText(value)));
	const isJsonBody = options.body !== undefined && typeof options.body !== 'string';
	const headers = Object.fromEntries(
		Object.entries({
			...(isJsonBody ? { 'content-type': 'application/json' } : {}),
			...options.headers,
		}).map(([key, value]) => [key, asText(value)]),
	);
	const method = options.method ?? 'GET';
	const response = await fetchFn(url, {
		method,
		headers,
		...(options.body === undefined ? {} : { body: asText(options.body) }),
	});
	const text = await response.text();
	const body: unknown =
		text && /json/.test(response.headers.get('content-type') ?? '') ? JSON.parse(text) : text;
	if (!response.ok) {
		throw new HttpError(
			`${method} ${url.origin}${url.pathname} failed with ${response.status}: ${text.slice(0, 300)}`,
			response.status,
		);
	}
	return fullResponse
		? { body, headers: Object.fromEntries(response.headers), statusCode: response.status }
		: body;
}

const pathOf = (issue: string) => issue.split(': ')[0];

function failure(issues: string[]): RunActionResult {
	return { ok: false, error: { message: issues.join('; '), path: pathOf(issues[0] ?? '') } };
}

function credentialFor(
	action: Action,
	options: RunActionOptions,
): CredentialDefinition | string | undefined {
	const { credential } = options;
	if (!credential) {
		return action.credentialTypes.length > 0 && !action.node.authOptional
			? `${action.id} needs a credential of type ${action.credentialTypes.join(' or ')}`
			: undefined;
	}
	if (!action.credentialTypes.includes(credential.type)) {
		return `${action.id} does not accept credential ${credential.type}. Accepts: ${action.credentialTypes.join(', ')}`;
	}
	return (
		options.credentials?.find(({ name }) => name === credential.type) ??
		`No credential definition for ${credential.type}. Pass it in "credentials".`
	);
}

/**
 * Run one action outside n8n: validate the input, call `run()` with a fetch-based HTTP client
 * that applies the credential, and validate each output item.
 */
export async function runAction(
	action: Action,
	options: RunActionOptions,
): Promise<RunActionResult> {
	// n8n fills in each parameter default, so run() sees them here too.
	const defaults = Object.fromEntries(
		Object.entries(action.input).flatMap(([key, schema]) =>
			schema.json.default === undefined ? [] : [[key, schema.json.default]],
		),
	);
	const input = isRecord(options.input) ? { ...defaults, ...options.input } : options.input;
	const inputIssues = validate(input, action.inputSchema);
	if (inputIssues.length > 0) return failure(inputIssues);
	if (!isRecord(input)) return failure(['input: must be an object']);
	const credential = credentialFor(action, options);
	if (typeof credential === 'string') return { ok: false, error: { message: credential } };
	const data = options.credential?.data ?? {};
	if (!isCredentialData(data)) return { ok: false, error: { message: 'Invalid credential data' } };

	const fetchFn = options.fetch ?? fetch;
	const http: Http = {
		request: async (request: HttpRequest) => {
			const base: IHttpRequestOptions = {
				method: request.method ?? 'GET',
				url: request.url ?? `${action.node.baseUrl ?? ''}${request.path ?? ''}`,
				qs: { ...request.query },
				headers: { ...request.headers },
				json: true,
				...(request.body !== undefined ? { body: request.body } : {}),
			};
			const authenticated = credential ? await authenticate(credential, data, base) : base;
			return await send(fetchFn, authenticated, request.fullResponse === true);
		},
	};

	const items: unknown[] = [];
	try {
		await action.run({ input, http, emit: (item) => items.push(item) });
	} catch (error) {
		// fetch reports network failures as "fetch failed" and puts the reason in `cause`.
		const cause =
			error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : '';
		const message = error instanceof Error ? `${error.message}${cause}` : String(error);
		return {
			ok: false,
			error: { message, ...(error instanceof HttpError ? { httpStatus: error.httpStatus } : {}) },
		};
	}
	const outputIssues = items.flatMap((item, index) =>
		validate(item, action.output.json, { path: `output[${index}]` }),
	);
	return outputIssues.length > 0 ? failure(outputIssues) : { ok: true, items };
}

export interface MockRoute {
	readonly method?: string;
	/** The URL path, or its end after the node's base path: `/tasks`. */
	readonly path: string;
	/** Every listed parameter must match. */
	readonly query?: Readonly<Record<string, string | number | boolean>>;
	readonly reply: {
		readonly status?: number;
		readonly json?: unknown;
		readonly headers?: Readonly<Record<string, string>>;
	};
}

export interface MockCall {
	readonly method: string;
	readonly url: string;
	readonly path: string;
	readonly query: Record<string, string>;
	readonly headers: Record<string, string>;
	readonly body: unknown;
}

export type MockFetch = typeof fetch & { readonly calls: MockCall[] };

const routeName = (route: MockRoute) => `${route.method ?? 'GET'} ${route.path}`;

/** A `fetch` stub that answers from `routes` and records each call. An unmatched call throws. */
export function mockHttp(routes: readonly MockRoute[]): MockFetch {
	const calls: MockCall[] = [];
	const mock = async (target: string | URL | Request, init: RequestInit = {}) => {
		const url = new URL(target instanceof Request ? target.url : target);
		const method = (init.method ?? 'GET').toUpperCase();
		const text = typeof init.body === 'string' ? init.body : undefined;
		const call: MockCall = {
			method,
			url: url.href,
			path: url.pathname,
			query: Object.fromEntries(url.searchParams),
			headers: Object.fromEntries(new Headers(init.headers)),
			body: text && /^\s*[[{]/.test(text) ? JSON.parse(text) : text,
		};
		calls.push(call);
		const route = routes.find(
			(candidate) =>
				(candidate.method ?? 'GET').toUpperCase() === method &&
				url.pathname.endsWith(candidate.path) &&
				Object.entries(candidate.query ?? {}).every(
					([key, value]) => call.query[key] === String(value),
				),
		);
		if (!route) {
			throw new Error(
				`mockHttp: no route for ${method} ${url.pathname}${url.search}. Routes: ${routes.map(routeName).join(', ') || 'none'}`,
			);
		}
		const { status = 200, json, headers } = route.reply;
		return new Response(json === undefined ? null : JSON.stringify(json), {
			status,
			headers: { 'content-type': 'application/json', ...headers },
		});
	};
	return Object.assign(mock, { calls });
}
