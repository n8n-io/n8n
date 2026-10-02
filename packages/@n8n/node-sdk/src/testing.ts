import { isRecord } from '@n8n/utils/is-record';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IDataObject,
	IHttpRequestOptions,
	INode,
} from 'n8n-workflow';

import { toCredentialType } from './credentials';
import {
	isHttpError,
	type Action,
	type CodeRunner,
	type DataTables,
	type HttpError,
} from './define';
import { AUTHENTICATION, executorOf, nodeNameOf, type ExecutorHost } from './runtime';
import type { ProviderCapabilities, ProviderKind } from './providers';

export interface RunActionOptions {
	readonly input: unknown;
	/** The input items. One empty item when omitted. */
	readonly items?: readonly IDataObject[];
	readonly credential?: { readonly type: string; readonly data: Record<string, unknown> };
	/** Legacy credential types, for a `compat` type. Other types project their own. */
	readonly credentials?: readonly ICredentialType[];
	/** Defaults to the global `fetch`. Pass `mockHttp(...)` in unit tests. */
	readonly fetch?: typeof fetch;
	/** The items of each named input, for an action with `inputs`. It replaces `items`. */
	readonly inputs?: ReadonlyArray<readonly IDataObject[]>;
	/** The data tables of an action that imports `dataTables`. */
	readonly dataTables?: DataTables;
	/** The task runner of an action that imports `code`. */
	readonly code?: CodeRunner;
	/** The wait of an action that imports `wait`. */
	readonly waitUntil?: (at: Date) => Promise<void>;
	/** What the providers give, by kind: a capability, or a list for a list field. */
	readonly providers?: {
		readonly [K in ProviderKind]?: ProviderCapabilities[K] | ReadonlyArray<ProviderCapabilities[K]>;
	};
}

export interface RunActionError {
	readonly message: string;
	/** The first failing field, e.g. `input.limit` or `output[0].id`. */
	readonly path?: string;
	readonly httpStatus?: number;
}

export type RunActionResult =
	| {
			readonly ok: true;
			/** The items of every output, in output order. */
			readonly items: unknown[];
			/** The items of each output, for an action with named outputs. */
			readonly outputs?: unknown[][];
	  }
	| { readonly ok: false; readonly error: RunActionError };

class ResponseError extends Error implements HttpError {
	constructor(
		message: string,
		readonly status: number,
		readonly headers: Readonly<Record<string, string>>,
		readonly body: unknown,
	) {
		super(message);
	}
}

const asText = (value: unknown) =>
	typeof value === 'string' ? value : (JSON.stringify(value) ?? '');

// Credential data is parsed JSON, so every value is a valid credential value.
const isCredentialData = (
	value: Record<string, unknown>,
): value is ICredentialDataDecryptedObject =>
	Object.values(value).every((entry) => entry !== undefined);

/** The n8n expression `={{$credentials.x}}`, for the one form credential templates use. */
function resolveTemplate<V>(
	template: V,
	credential: ICredentialType,
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

/** Does what n8n's `httpRequestWithAuthentication` does for the types `toCredentialType` makes. */
async function authenticate(
	credential: ICredentialType,
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
	const text = (value: string) => String(resolveTemplate(value, credential, data));
	const { headers, qs, auth: basic, body } = auth.properties;
	// As n8n core: each value goes into the request part of the same name.
	return {
		...options,
		headers: { ...options.headers, ...resolve(headers) },
		qs: { ...options.qs, ...resolve(qs) },
		...(basic
			? {
					auth: { ...options.auth, username: text(basic.username), password: text(basic.password) },
				}
			: {}),
		...(body
			? { body: { ...(isRecord(options.body) ? options.body : {}), ...resolve(body) } }
			: {}),
	};
}

/** The hidden field where n8n core stores the token of `preAuthentication`. */
const expirableFieldOf = (type: ICredentialType) =>
	type.properties.find(
		(property) => property.type === 'hidden' && property.typeOptions?.expirable === true,
	)?.name;

/** Sends what the executor would pass to n8n's `httpRequest`. */
async function send(fetchFn: typeof fetch, options: IHttpRequestOptions) {
	const url = new URL(options.url);
	Object.entries(options.qs ?? {})
		.flatMap(([key, value]) =>
			(Array.isArray(value) ? value : [value]).map((one): [string, unknown] => [key, one]),
		)
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
		...(options.timeout ? { signal: AbortSignal.timeout(options.timeout) } : {}),
	});
	const text = await response.text();
	const body: unknown =
		text && /json/.test(response.headers.get('content-type') ?? '') ? JSON.parse(text) : text;
	const responseHeaders = Object.fromEntries(response.headers);
	if (!response.ok) {
		throw new ResponseError(
			`${method} ${url.origin}${url.pathname} failed with ${response.status}: ${scrubSecretsInText(text).slice(0, 300)}`,
			response.status,
			responseHeaders,
			body,
		);
	}
	return options.returnFullResponse
		? { body, headers: responseHeaders, statusCode: response.status }
		: body;
}

/** The first failing field in an executor message, e.g. `input.limit` or `output[0].id`. */
const pathOf = (message: string) => /\b((?:input|output)[\w.[\]]*): /.exec(message)?.[1];

function credentialFor(
	action: Action,
	options: RunActionOptions,
): ICredentialType | string | undefined {
	const { credential } = options;
	if (!credential) {
		return action.credentialTypes.length > 0 && !action.node.credential?.optional
			? `${action.id} needs a credential of type ${action.credentialTypes.join(' or ')}`
			: undefined;
	}
	if (!action.credentialTypes.includes(credential.type)) {
		return `${action.id} does not accept credential ${credential.type}. Accepts: ${action.credentialTypes.join(', ')}`;
	}
	const value = action.node.credential?.types.find(({ name }) => name === credential.type);
	return (
		(value ? toCredentialType(value) : undefined) ??
		options.credentials?.find(({ name }) => name === credential.type) ??
		`No credential definition for ${credential.type}. Pass it in "credentials".`
	);
}

/**
 * Run one action outside n8n, through the executor n8n runs, with a fetch-based HTTP client
 * that applies the credential.
 */
export async function runAction(
	action: Action,
	options: RunActionOptions,
): Promise<RunActionResult> {
	const { input } = options;
	if (!isRecord(input)) return { ok: false, error: { message: 'input: must be an object' } };
	const raw = options.credential?.data ?? {};
	const data = isCredentialData(raw) ? raw : {};
	const credential = isCredentialData(raw)
		? credentialFor(action, options)
		: 'Invalid credential data';
	const fetchFn = options.fetch ?? fetch;
	const node: INode = {
		id: 'runAction',
		name: action.action,
		type: nodeNameOf(action.id),
		typeVersion: action.version,
		position: [0, 0],
		parameters: {},
		credentials:
			typeof credential === 'object'
				? { [credential.name]: { id: null, name: credential.name } }
				: {},
	};
	// The token of an `exchange` type, as n8n core stores it: one token request per run.
	const tokens = new Map<'data', Promise<ICredentialDataDecryptedObject>>();
	const tokenData = async (refresh: boolean) => {
		const preAuthentication =
			typeof credential === 'object' ? credential.preAuthentication : undefined;
		const field = typeof credential === 'object' ? expirableFieldOf(credential) : undefined;
		if (!preAuthentication || field === undefined) return data;
		const current = tokens.get('data');
		if (current && !refresh) return await current;
		if (!current && !refresh && data[field]) return data;
		const helper = {
			helpers: {
				httpRequest: async (options: IHttpRequestOptions) => await send(fetchFn, options),
			},
		};
		const next = preAuthentication.call(helper, { ...data }).then((output) => {
			const merged = { ...data, ...output };
			return isCredentialData(merged) ? merged : data;
		});
		tokens.set('data', next);
		return await next;
	};
	const itemsOf = (list: readonly IDataObject[]) => list.map((json) => ({ json: { ...json } }));
	const inputs = options.inputs?.map(itemsOf);
	const items = inputs?.[0] ?? itemsOf(options.items ?? [{}]);
	const host: ExecutorHost = {
		items,
		inputItems: (index) => inputs?.[index] ?? [],
		dataTables: options.dataTables,
		code: options.code,
		waitUntil: options.waitUntil,
		node,
		parameter: (name) =>
			name === AUTHENTICATION
				? typeof credential === 'object'
					? credential.name
					: 'none'
				: input[name],
		// A credential problem fails the first request, after the input check, as in n8n.
		request: async (request) => {
			if (typeof credential === 'string') throw new Error(credential);
			if (!credential) return await send(fetchFn, request);
			const attempt = async (refresh: boolean) =>
				await send(fetchFn, await authenticate(credential, await tokenData(refresh), request));
			// As n8n core: after a 401, one new token request and one more attempt.
			return await attempt(false).catch(async (error: unknown) => {
				if (!credential.preAuthentication || !isHttpError(error) || error.status !== 401) {
					throw error;
				}
				return await attempt(true);
			});
		},
		// As n8n: the stored data holds the token once a token request stored it.
		credentialData: async () => (await tokens.get('data')) ?? data,
		continueOnFail: () => false,
		supplied: async (kind) => await Promise.resolve(options.providers?.[kind]),
	};
	try {
		const outputs = (await executorOf(action)(host)).map((output) =>
			output.map((item) => item.json),
		);
		return { ok: true, items: outputs.flat(), ...(action.outputs ? { outputs } : {}) };
	} catch (error) {
		// fetch reports network failures as "fetch failed" and puts the reason in `cause`.
		const cause =
			error instanceof Error &&
			error.cause instanceof Error &&
			!error.message.includes(error.cause.message)
				? `: ${error.cause.message}`
				: '';
		const message = scrubSecretsInText(
			error instanceof Error ? `${error.message}${cause}` : String(error),
		);
		const path = pathOf(message);
		return {
			ok: false,
			error: {
				message,
				...(path ? { path } : {}),
				...(isHttpError(error) ? { httpStatus: error.status } : {}),
			},
		};
	}
}

type MockQueryValue = string | number | boolean;

export interface MockRoute {
	readonly method?: string;
	/** The URL path, or its end after the node's base path: `/tasks`. */
	readonly path: string;
	/**
	 * Every listed parameter must match; other parameters may also be present. When more
	 * routes match, the route with the most listed parameters answers. An array matches a
	 * repeated parameter.
	 */
	readonly query?: Readonly<Record<string, MockQueryValue | readonly MockQueryValue[]>>;
	/** The route answers at most this many calls, then the next matching route answers. */
	readonly times?: number;
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
	/** A repeated parameter is an array, in order. */
	readonly query: Record<string, string | string[]>;
	/** Lower-case names, e.g. `authorization`. */
	readonly headers: Record<string, string>;
	/** A JSON body is already parsed. */
	readonly body: unknown;
}

export type MockFetch = typeof fetch & { readonly calls: MockCall[] };

/** More calls than any test needs: the code under test loops. */
const MAX_MOCK_CALLS = 1000;

const queryOf = (params: URLSearchParams): Record<string, string | string[]> =>
	Object.fromEntries(
		[...new Set(params.keys())].map((key) => {
			const values = params.getAll(key);
			return [key, values.length === 1 ? (values[0] ?? '') : values];
		}),
	);

const routeName = (route: MockRoute) =>
	`${route.method ?? 'GET'} ${route.path}${route.query ? ` ${JSON.stringify(route.query)}` : ''}`;

/** A `fetch` stub that answers from `routes` and records each call. An unmatched call throws. */
export function mockHttp(routes: readonly MockRoute[]): MockFetch {
	const calls: MockCall[] = [];
	const answered = new Map<MockRoute, number>();
	const mock = async (target: string | URL | Request, init: RequestInit = {}) => {
		const url = new URL(target instanceof Request ? target.url : target);
		const method = (init.method ?? 'GET').toUpperCase();
		const text = typeof init.body === 'string' ? init.body : undefined;
		const call: MockCall = {
			method,
			url: url.href,
			path: url.pathname,
			query: queryOf(url.searchParams),
			headers: Object.fromEntries(new Headers(init.headers)),
			body: text && /^\s*[[{]/.test(text) ? JSON.parse(text) : text,
		};
		calls.push(call);
		// A paging loop over mocks only runs microtasks, so a test timeout never fires.
		if (calls.length > MAX_MOCK_CALLS) {
			throw new Error(
				`mockHttp: more than ${MAX_MOCK_CALLS} calls, the last ${method} ${url.pathname}${url.search}. The code loops: a route answers each call that has its listed query parameters. Add "times: 1" to a page route, or list the page parameter in each route.`,
			);
		}
		const route = routes
			.filter(
				(candidate) =>
					(candidate.method ?? 'GET').toUpperCase() === method &&
					url.pathname.endsWith(candidate.path) &&
					(candidate.times === undefined || (answered.get(candidate) ?? 0) < candidate.times) &&
					Object.entries(candidate.query ?? {}).every(
						([key, value]) =>
							JSON.stringify([call.query[key] ?? []].flat()) ===
							JSON.stringify([value].flat().map(String)),
					),
			)
			.reduce<MockRoute | undefined>(
				(best, candidate) =>
					best && Object.keys(best.query ?? {}).length >= Object.keys(candidate.query ?? {}).length
						? best
						: candidate,
				undefined,
			);
		if (!route) {
			throw new Error(
				`mockHttp: no route for ${method} ${url.pathname}${url.search}. Routes: ${routes.map(routeName).join(', ') || 'none'}`,
			);
		}
		answered.set(route, (answered.get(route) ?? 0) + 1);
		const { status = 200, json, headers } = route.reply;
		return new Response(json === undefined ? null : JSON.stringify(json), {
			status,
			headers: { 'content-type': 'application/json', ...headers },
		});
	};
	return Object.assign(mock, { calls });
}
