/**
 * Shared parts of the request-equivalence check: the case type and the
 * normal form of a request. The v1 recorder and the library side both
 * normalize to this form before the test compares them.
 */

/** One v1 node run to compare with the compiled library node. */
export interface EquivalenceCase {
	/** Unique name. The recording file uses it as the key. */
	name: string;
	type: string;
	typeVersion: number;
	parameters: Record<string, unknown>;
	/** Input items. The default is one empty item. */
	items?: Array<Record<string, unknown>>;
	/** The credential type the v1 node uses, and fake credential data. */
	credential?: { type: string; data: Record<string, unknown> };
	/** HTTP responses, in request order. The last one repeats. */
	responses: Array<{ status?: number; headers?: Record<string, string>; body: unknown }>;
	/**
	 * Results of n8n service calls (`ctx.service`, spec 9.9), in call order. The
	 * recorder gives them to the v1 node through a recording data-table service.
	 */
	serviceResults?: unknown[];
	/**
	 * The message of the error that v1 raises. The case then compares the requests
	 * up to the failure and the error, not the output. Without it, v1 must succeed.
	 */
	expectedError?: string;
}

/** One `ctx.service` call: the `service`, `op` and `args` of the effect. */
export interface ServiceCallRecord {
	service: string;
	op: string;
	args: unknown;
}

export interface NormalRequest {
	method: string;
	url: string;
	qs: Record<string, unknown>;
	headers: Record<string, string>;
	body?: unknown;
	basicAuth?: { user: string; password: string };
	/** How `qs` goes into the URL (spec 7.1), when the recording or the call says it. */
	qsFormat?: string;
}

export interface Recording {
	requests: NormalRequest[];
	/** The service calls of the v1 node, as `ctx.service` effects carry them. */
	services?: ServiceCallRecord[];
	/** The JSON of the output items of the v1 node. */
	output?: unknown[];
	/** The error message when the v1 node failed. */
	error?: string;
}

export interface RawRequest {
	method?: string;
	url: string;
	baseURL?: string;
	qs?: unknown;
	headers?: unknown;
	body?: unknown;
	auth?: unknown;
	qsFormat?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isAbsoluteUrl = (url: string) => /^[a-z][a-z\d+\-.]*:\/\//i.test(url);

/** Query values as text, as the wire carries them. */
function textLeaves(value: unknown): unknown {
	if (value === undefined || value === null) return undefined;
	if (Array.isArray(value)) return value.map(textLeaves);
	if (isRecord(value)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			const leaf = textLeaves(v);
			if (leaf !== undefined) out[k] = leaf;
		}
		return out;
	}
	return typeof value === 'string' ? value : JSON.stringify(value);
}

function jsonCopy(value: unknown): unknown {
	if (value === undefined) return undefined;
	const text = JSON.stringify(value);
	return text === undefined ? undefined : JSON.parse(text);
}

/**
 * Removes the n8n instance id from attribution links. A compiled workflow does
 * not know the instance, so its library nodes link without it.
 */
export function withoutInstanceId<T>(value: T): T;
export function withoutInstanceId(value: unknown): unknown {
	if (typeof value === 'string')
		return value.replace(/(utm_campaign=[\w.%-]+)_[0-9a-f]{64}/g, '$1');
	if (Array.isArray(value)) return value.map(withoutInstanceId);
	if (isRecord(value)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) out[k] = withoutInstanceId(v);
		return out;
	}
	return value;
}

/**
 * Normalizes a request:
 * - the base URL joins the URL as axios does, and the query string of the URL
 *   moves into `qs`,
 * - header names are lower case; a JSON content type is dropped, because both
 *   sides send JSON bodies with it,
 * - an empty object body is no body, as in n8n's request conversion.
 */
export function normalizeRequest(raw: RawRequest): NormalRequest {
	let url = raw.url;
	if (raw.baseURL && !isAbsoluteUrl(url)) {
		url = `${raw.baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
	}
	const qs: Record<string, unknown> = {};
	const q = url.indexOf('?');
	if (q >= 0) {
		for (const [k, v] of new URLSearchParams(url.slice(q + 1))) {
			const prev = qs[k];
			qs[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
		}
		url = url.slice(0, q);
	}
	const explicit = textLeaves(raw.qs);
	if (isRecord(explicit)) Object.assign(qs, explicit);
	const headers: Record<string, string> = {};
	if (isRecord(raw.headers)) {
		for (const [k, v] of Object.entries(raw.headers)) {
			if (v === undefined || v === null) continue;
			const name = k.toLowerCase();
			const value = typeof v === 'string' ? v : JSON.stringify(v);
			if (name === 'content-type' && value.startsWith('application/json')) continue;
			headers[name] = value;
		}
	}
	const out: NormalRequest = {
		method: (raw.method ?? 'GET').toUpperCase(),
		url,
		qs,
		headers,
	};
	let body = withoutInstanceId(jsonCopy(raw.body));
	if (isRecord(body) && Object.keys(body).length === 0) body = undefined;
	if (body === '') body = undefined;
	if (body !== undefined) out.body = body;
	if (isRecord(raw.auth)) {
		const user = raw.auth.username ?? raw.auth.user;
		const password = raw.auth.password ?? raw.auth.pass;
		out.basicAuth = {
			user: typeof user === 'string' ? user : '',
			password: typeof password === 'string' ? password : '',
		};
	}
	if (raw.qsFormat !== undefined) out.qsFormat = raw.qsFormat;
	return out;
}

/** The `inject` of a credentials file entry (spec section 7). */
export interface InjectSpec {
	headers?: Record<string, string>;
	qs?: Record<string, string>;
	body?: Record<string, string>;
	basicAuth?: { user: string; password: string };
}

const TEMPLATE = /\{\{\$credentials\.([A-Za-z0-9_.-]+)\}\}/g;

function fill(text: string, data: Record<string, unknown>): string {
	return text.replace(TEMPLATE, (_m, path: string) => {
		let value: unknown = data;
		for (const key of path.split('.')) value = isRecord(value) ? value[key] : undefined;
		if (value === undefined || value === null) throw new Error(`credential has no ${path}`);
		return typeof value === 'string' ? value : JSON.stringify(value);
	});
}

function fillDeep(value: unknown, data: Record<string, unknown>): unknown {
	if (typeof value === 'string') return fill(value, data);
	if (Array.isArray(value)) return value.map((v) => fillDeep(v, data));
	if (isRecord(value)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) out[k] = fillDeep(v, data);
		return out;
	}
	return value;
}

/**
 * Applies a credential to an `http` effect as the runtime does (spec section
 * 7): it fills templates in the URL, headers, query and body strings, sets
 * the inject headers, adds the inject query parameters and body fields, and
 * sets basic auth.
 */
export function applyCredential(
	request: {
		method: string;
		url: string;
		headers?: unknown;
		qs?: unknown;
		body?: unknown;
		qsFormat?: string;
	},
	inject: InjectSpec | undefined,
	data: Record<string, unknown>,
): RawRequest {
	const headers = isRecord(request.headers) ? { ...request.headers } : {};
	const qs = isRecord(request.qs) ? { ...request.qs } : {};
	let body = request.body;
	for (const [k, v] of Object.entries(inject?.headers ?? {})) {
		for (const existing of Object.keys(headers)) {
			if (existing.toLowerCase() === k.toLowerCase()) delete headers[existing];
		}
		headers[k] = v;
	}
	Object.assign(qs, inject?.qs ?? {});
	if (inject?.body) body = { ...(isRecord(body) ? body : {}), ...inject.body };
	const raw: RawRequest = {
		method: request.method,
		url: fill(request.url, data),
		headers: fillDeep(headers, data),
		qs: fillDeep(qs, data),
		body: fillDeep(body, data),
		...(request.qsFormat !== undefined ? { qsFormat: request.qsFormat } : {}),
	};
	if (inject?.basicAuth) {
		raw.auth = {
			username: fill(inject.basicAuth.user, data),
			password: fill(inject.basicAuth.password, data),
		};
	}
	return raw;
}
