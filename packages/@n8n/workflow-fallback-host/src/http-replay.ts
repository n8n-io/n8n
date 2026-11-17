/**
 * Answers of GET requests that a compiled library node received before it handed the
 * node over to the host (`replay` of a node step).
 *
 * A library node can find, after it sent GET requests, that only the v1 node gives the
 * exact result. The host then runs the v1 node, and the v1 node sends the same requests.
 * n8n's v1 engine sends each of them once. So the step carries the answers that the
 * library node received, and the host gives each one to the v1 node instead of a second
 * request on the network.
 *
 * - An entry answers one request with the same method, URL and query, in the order of
 *   the list. A request that no free entry matches goes to the network as usual. A second
 *   identical request gets the next entry with that URL, or goes to the network.
 * - Only GET and HEAD requests without a body get an answer from the list.
 * - The match is where n8n-core's request helpers send: `http.request` and
 *   `https.request` (as `http-pool.ts`). The request goes to a server of this process on
 *   the loopback interface, which writes the status, the headers and the body of the
 *   entry. So the v1 node gets a real response of Node.js, in the shape of each helper.
 * - The path of such a request is a random token that works once. The token ends with the
 *   step.
 * - An entry that the host cannot read is left out. The replay never fails a step.
 * - A step without `replay` pays nothing until the first step with one, and then one
 *   lookup of the async context for each request.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import type { AddressInfo } from 'node:net';

import type { JsonObject, JsonValue } from './protocol';
import { isJsonObject } from './protocol';
import { BINARY_KEY } from './binary';

/** The most entries of one step. The library nodes send at most 256. */
export const MAX_REPLAY_ENTRIES = 1024;

/** A stored body of an entry: n8n's binary reference (`{ $binary: { id, data, mimeType } }`). */
export interface StoredBody {
	id: string;
	data: string;
	mimeType: string;
}

/** One answer, as the step carries it. */
export interface ReplayEntry {
	method: string;
	/** `METHOD origin/path?sorted query`: the key of the request that the entry answers. */
	key: string;
	status: number;
	headers: Record<string, string>;
	body: Buffer | StoredBody;
}

/** Reads the bytes of a stored body, or undefined when the store does not have them. */
export type ReadStoredBody = (body: StoredBody) => Promise<Buffer | undefined>;

interface Answer {
	method: string;
	key: string;
	status: number;
	headers: Record<string, string>;
	body: Buffer;
	used: boolean;
}

interface ReplayState {
	answers: Answer[];
	tokens: string[];
}

const scope = new AsyncLocalStorage<ReplayState>();

/** The answers that wait for their request on the loopback server, by token. */
const pending = new Map<string, Answer>();

/** Headers that describe the transfer of the first response, not the body that the host writes. */
const TRANSFER_HEADERS = new Set([
	'connection',
	'content-encoding',
	'content-length',
	'keep-alive',
	'transfer-encoding',
]);

/** `a[0]` and `a[]` are the key `a`: the query formats of the request helpers differ in this only. */
function plainKey(key: string): string {
	return key.replace(/\[\d*\]$/, '');
}

function addQuery(pairs: Array<[string, string]>, key: string, value: JsonValue | undefined): void {
	if (value === undefined || value === null) return;
	if (Array.isArray(value)) {
		for (const member of value) addQuery(pairs, key, member);
		return;
	}
	if (isJsonObject(value)) {
		for (const [name, member] of Object.entries(value)) addQuery(pairs, `${key}[${name}]`, member);
		return;
	}
	pairs.push([key, String(value)]);
}

/** The key of a request: the method, the URL without a fragment, and the query in a fixed order. */
export function requestKey(method: string, url: URL, qs: JsonObject = {}): string {
	const pairs: Array<[string, string]> = [];
	for (const [key, value] of url.searchParams) pairs.push([plainKey(key), value]);
	for (const [key, value] of Object.entries(qs)) addQuery(pairs, key, value);
	const query = pairs
		.map(([key, value]) => `${encodeURIComponent(plainKey(key))}=${encodeURIComponent(value)}`)
		.sort()
		.join('&');
	return `${method.toUpperCase()} ${url.origin}${url.pathname}?${query}`;
}

function readHeaders(value: JsonValue | undefined): Record<string, string> {
	const headers: Record<string, string> = {};
	if (!isJsonObject(value)) return headers;
	for (const [name, text] of Object.entries(value)) {
		const lower = name.toLowerCase();
		if (typeof text !== 'string' || TRANSFER_HEADERS.has(lower)) continue;
		try {
			http.validateHeaderName(lower);
			http.validateHeaderValue(lower, text);
		} catch {
			continue;
		}
		headers[lower] = text;
	}
	return headers;
}

function readBody(value: JsonValue | undefined): Buffer | StoredBody {
	if (value === undefined || value === null) return Buffer.alloc(0);
	if (typeof value === 'string') return Buffer.from(value, 'utf8');
	if (isJsonObject(value) && isJsonObject(value[BINARY_KEY])) {
		const { id, data, mimeType } = value[BINARY_KEY];
		if (typeof id === 'string' && typeof data === 'string') {
			return { id, data, mimeType: typeof mimeType === 'string' ? mimeType : '' };
		}
	}
	return Buffer.from(JSON.stringify(value), 'utf8');
}

/**
 * The entries of `replay` of a node step: `{ method, url, qs, body, response: { status,
 * headers, body } }` for each request that the library node sent. Entries that the host
 * cannot answer (a request with a body, another method, a bad URL) are left out.
 */
export function readReplay(value: JsonValue | undefined): ReplayEntry[] {
	if (!Array.isArray(value)) return [];
	const entries: ReplayEntry[] = [];
	for (const entry of value.slice(0, MAX_REPLAY_ENTRIES)) {
		if (!isJsonObject(entry) || !isJsonObject(entry.response)) continue;
		const { method, url, qs, body, response } = entry;
		if (method !== 'GET' && method !== 'HEAD') continue;
		if (typeof url !== 'string' || (body !== undefined && body !== null)) continue;
		const { status } = response;
		if (typeof status !== 'number' || !Number.isInteger(status) || status < 200 || status > 599) {
			continue;
		}
		let target: URL;
		try {
			target = new URL(url);
		} catch {
			continue;
		}
		entries.push({
			method,
			key: requestKey(method, target, isJsonObject(qs) ? qs : {}),
			status,
			headers: readHeaders(response.headers),
			body: readBody(response.body),
		});
	}
	return entries;
}

let server: Promise<number> | undefined;

/** Starts the loopback server once. Gives its port. */
async function replayServer(): Promise<number> {
	server ??= new Promise<number>((resolve, reject) => {
		const listener = http.createServer((request, response) => {
			const answer = pending.get(request.url ?? '');
			request.resume();
			if (!answer) {
				response.writeHead(410).end();
				return;
			}
			pending.delete(request.url ?? '');
			response.sendDate = answer.headers.date === undefined;
			const empty = request.method === 'HEAD' || answer.status === 204 || answer.status === 304;
			response.writeHead(answer.status, {
				...answer.headers,
				...(answer.status === 204 || answer.status === 304
					? {}
					: { 'content-length': String(answer.body.length) }),
				connection: 'close',
			});
			response.end(empty ? undefined : answer.body);
		});
		listener.once('error', reject);
		listener.listen(0, '127.0.0.1', () => {
			// The server never keeps the process alive.
			listener.unref();
			const address = listener.address();
			resolve(isAddress(address) ? address.port : 0);
		});
	});
	return await server;
}

function isAddress(value: unknown): value is AddressInfo {
	return typeof value === 'object' && value !== null && 'port' in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function headerOf(headers: unknown, name: string): unknown {
	if (!isRecord(headers)) return undefined;
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === name) return value;
	}
	return undefined;
}

/** The method and URL of a call of `http.request`, or undefined when the call can send a body. */
function requestOf(
	args: unknown[],
	defaultProtocol: string,
): { key: string; at: number } | undefined {
	const first = args[0];
	const at = isRecord(first) && !(first instanceof URL) ? 0 : 1;
	const options = isRecord(args[at]) ? args[at] : {};
	const method = typeof options.method === 'string' ? options.method.toUpperCase() : 'GET';
	if (method !== 'GET' && method !== 'HEAD') return undefined;
	const length = headerOf(options.headers, 'content-length');
	if (length !== undefined && length !== 0 && length !== '0') return undefined;
	if (headerOf(options.headers, 'transfer-encoding') !== undefined) return undefined;
	if (options.socketPath !== undefined) return undefined;
	try {
		let url: URL;
		if (first instanceof URL) url = new URL(first.href);
		else if (typeof first === 'string') url = new URL(first);
		else {
			const protocol = typeof options.protocol === 'string' ? options.protocol : defaultProtocol;
			const host = options.hostname ?? options.host ?? 'localhost';
			if (typeof host !== 'string') return undefined;
			const path = typeof options.path === 'string' ? options.path : '/';
			const port =
				typeof options.port === 'number' || typeof options.port === 'string'
					? `:${options.port}`
					: '';
			// `host` can hold the port; then `port` is not set.
			url = new URL(
				`${protocol}//${host.includes(':') && !host.startsWith('[') ? host : `${host}${port}`}${path}`,
			);
		}
		return { key: requestKey(method, url), at };
	} catch {
		return undefined;
	}
}

let installed = false;
let port = 0;

/** Makes `http.request` and `https.request` ask the entries of the running step first. */
function install(): void {
	if (installed) return;
	installed = true;
	// The request to the loopback server is plain HTTP, also for an HTTPS request.
	const plain = http.request;
	patch(http, 'http:', plain);
	patch(https, 'https:', plain);
}

function patch(
	module: { request: typeof http.request },
	protocol: string,
	plain: typeof http.request,
): void {
	const original = module.request;
	const request = function (this: unknown, ...args: unknown[]): http.ClientRequest {
		const state = scope.getStore();
		if (state === undefined) return Reflect.apply(original, this, args);
		const sent = requestOf(args, protocol);
		const answer = sent && state.answers.find((entry) => !entry.used && entry.key === sent.key);
		if (!sent || !answer) return Reflect.apply(original, this, args);
		answer.used = true;
		const token = `/${randomBytes(16).toString('hex')}`;
		pending.set(token, answer);
		state.tokens.push(token);
		const options = isRecord(args[sent.at]) ? args[sent.at] : {};
		const done = args.find((arg) => typeof arg === 'function');
		const target = {
			host: '127.0.0.1',
			port,
			path: token,
			method: answer.method,
			agent: false,
			...(isRecord(options) && options.signal !== undefined ? { signal: options.signal } : {}),
			...(isRecord(options) && typeof options.timeout === 'number'
				? { timeout: options.timeout }
				: {}),
		};
		return Reflect.apply(plain, http, done === undefined ? [target] : [target, done]);
	};
	Reflect.set(module, 'request', request);
	// `get` calls the module's own `request`, not the export. This is Node.js's `get`.
	Reflect.set(module, 'get', function (this: unknown, ...args: unknown[]): http.ClientRequest {
		const req = Reflect.apply(request, this, args);
		req.end();
		return req;
	});
}

/**
 * Runs `run` with the entries: a request of `run` that matches a free entry gets the answer
 * of the entry. Without entries, `run` runs as it is.
 */
export async function withReplay<T>(
	entries: ReplayEntry[],
	readStored: ReadStoredBody,
	run: () => Promise<T>,
): Promise<T> {
	const answers: Answer[] = [];
	for (const entry of entries) {
		let body: Buffer | undefined;
		if (Buffer.isBuffer(entry.body)) body = entry.body;
		else {
			try {
				body = await readStored(entry.body);
			} catch {
				body = undefined;
			}
		}
		// Without its bytes, the entry answers nothing: the request goes to the network.
		if (body === undefined) continue;
		answers.push({ ...entry, body, used: false });
	}
	if (answers.length === 0) return await run();
	try {
		port = await replayServer();
	} catch {
		server = undefined;
		return await run();
	}
	install();
	const state: ReplayState = { answers, tokens: [] };
	try {
		return await scope.run(state, run);
	} finally {
		for (const token of state.tokens) pending.delete(token);
	}
}
