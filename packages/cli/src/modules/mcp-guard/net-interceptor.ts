import { AsyncLocalStorage } from 'node:async_hooks';
import http from 'node:http';
import https from 'node:https';
import { PassThrough, Writable } from 'node:stream';

import { currentNodeGuard } from './chat-scope';

export interface CapturedRequest {
	method: string;
	url: URL;
	headers: Record<string, string>;
	body?: Buffer;
}

/** `Response` answers the request. `passthrough` sends it to the real network. */
export type RequestDecider = (req: CapturedRequest) => Promise<Response | 'passthrough'>;

type Lib = typeof http | typeof https;
type RequestFn = typeof http.request;

interface Originals {
	httpRequest: typeof http.request;
	httpGet: typeof http.get;
	httpsRequest: typeof https.request;
	httpsGet: typeof https.get;
	fetch: typeof globalThis.fetch;
}

let installed: { decide: RequestDecider; originals: Originals } | undefined;

// The work of a decision (gym calls, real reads, model calls) runs inside this flag, so the
// interceptor does not catch it again.
const bypass = new AsyncLocalStorage<true>();
const intercepting = (): boolean =>
	currentNodeGuard() !== undefined && bypass.getStore() === undefined;
const unintercepted = async <T>(fn: () => Promise<T>): Promise<T> => await bypass.run(true, fn);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const text = (v: unknown, fallback: string): string =>
	typeof v === 'string' || typeof v === 'number' ? String(v) : fallback;

const headerValue = (v: unknown): string =>
	Array.isArray(v) ? v.map((item) => text(item, '')).join(', ') : text(v, '');

function lowerHeaders(raw: unknown): Record<string, string> {
	const out: Record<string, string> = {};
	if (!isRecord(raw)) return out;
	for (const [key, value] of Object.entries(raw)) {
		if (value !== undefined) out[key.toLowerCase()] = headerValue(value);
	}
	return out;
}

// Reads the arguments of `http.request(url?, options?, callback?)`.
function readArgs(protocol: 'http:' | 'https:', args: unknown[]) {
	const [first, second] = args;
	const onResponse = args.find(
		(a): a is (res: http.IncomingMessage) => void => typeof a === 'function',
	);
	const fromUrl =
		typeof first === 'string' ? new URL(first) : first instanceof URL ? first : undefined;
	const options = isRecord(fromUrl ? second : first) ? (fromUrl ? second : first) : {};
	const opts = options as Record<string, unknown>;
	const host = text(opts.hostname ?? opts.host, fromUrl?.hostname ?? 'localhost');
	const port = text(opts.port, fromUrl?.port ?? '');
	const path = text(opts.path, fromUrl ? fromUrl.pathname + fromUrl.search : '/');
	const url = new URL(`${protocol}//${host}${port ? `:${port}` : ''}${path}`);
	return {
		url,
		method: text(opts.method, 'GET').toUpperCase(),
		headers: lowerHeaders(opts.headers),
		onResponse,
	};
}

const PLAIN_BODY_DROPS: ReadonlySet<string> = new Set([
	'content-encoding',
	'content-length',
	'transfer-encoding',
]);

async function toIncomingMessage(res: Response): Promise<http.IncomingMessage> {
	const headers: Record<string, string> = {};
	const rawHeaders: string[] = [];
	res.headers.forEach((value, key) => {
		// The body is plain, so a header that describes an encoded or sized body would be wrong.
		if (PLAIN_BODY_DROPS.has(key)) return;
		headers[key] = value;
		rawHeaders.push(key, value);
	});
	const stream = Object.assign(new PassThrough(), {
		statusCode: res.status,
		statusMessage: res.statusText,
		httpVersion: '1.1',
		headers,
		rawHeaders,
	});
	stream.end(Buffer.from(await res.arrayBuffer()));
	return stream as unknown as http.IncomingMessage;
}

/** A stand-in for `ClientRequest`. It buffers the body, then asks `decide` how to answer. */
class InterceptedRequest extends Writable {
	private readonly chunks: Buffer[] = [];

	private readonly headers: Record<string, string>;

	constructor(
		private readonly lib: Lib,
		private readonly realArgs: unknown[],
		private readonly captured: Omit<CapturedRequest, 'body'>,
		private readonly decide: RequestDecider,
	) {
		super();
		this.headers = { ...captured.headers };
	}

	setHeader(name: string, value: unknown): this {
		this.headers[name.toLowerCase()] = headerValue(value);
		return this;
	}

	getHeader(name: string): string | undefined {
		return this.headers[name.toLowerCase()];
	}

	removeHeader(name: string): void {
		delete this.headers[name.toLowerCase()];
	}

	// Calls that a real request has and that need no work here.
	setTimeout(_ms?: number, onTimeout?: () => void): this {
		if (onTimeout) this.once('timeout', onTimeout);
		return this;
	}

	setNoDelay(): this {
		return this;
	}

	setSocketKeepAlive(): this {
		return this;
	}

	flushHeaders(): void {}

	abort(): void {
		this.destroy();
	}

	override _write(chunk: Buffer, _enc: BufferEncoding, done: (error?: Error | null) => void): void {
		this.chunks.push(Buffer.from(chunk));
		done();
	}

	override _final(done: (error?: Error | null) => void): void {
		const body = this.chunks.length > 0 ? Buffer.concat(this.chunks) : undefined;
		this.answer({ ...this.captured, headers: { ...this.headers }, body }).then(
			() => done(),
			(error: unknown) => done(error instanceof Error ? error : new Error(String(error))),
		);
	}

	private async answer(req: CapturedRequest): Promise<void> {
		const decision = await unintercepted(async () => await this.decide(req));
		if (decision === 'passthrough') {
			this.sendToNetwork(req);
			return;
		}
		this.emit('response', await toIncomingMessage(decision));
	}

	private sendToNetwork(req: CapturedRequest): void {
		const original = installed?.originals;
		const request = this.lib === https ? original?.httpsRequest : original?.httpRequest;
		if (!request) throw new Error('net interceptor is not installed');
		const real = request(...(this.realArgs as Parameters<RequestFn>));
		for (const [name, value] of Object.entries(req.headers)) real.setHeader(name, value);
		real.on('response', (res) => this.emit('response', res));
		real.on('error', (error) => this.emit('error', error));
		real.end(req.body);
	}
}

function patchedRequest(lib: Lib, original: RequestFn, decide: () => RequestDecider) {
	const protocol = lib === https ? 'https:' : 'http:';
	return (...args: unknown[]): http.ClientRequest => {
		if (!intercepting()) return original(...(args as Parameters<RequestFn>));
		const { url, method, headers, onResponse } = readArgs(protocol, args);
		const realArgs = args.filter((a) => typeof a !== 'function');
		const proxy = new InterceptedRequest(lib, realArgs, { url, method, headers }, async (req) => {
			return await decide()(req);
		});
		if (onResponse) proxy.once('response', onResponse);
		return proxy as unknown as http.ClientRequest;
	};
}

function patchedFetch(original: typeof globalThis.fetch, decide: () => RequestDecider) {
	return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
		if (!intercepting()) return await original(input, init);
		const probe = input instanceof Request ? input.clone() : new Request(input, init);
		const headers: Record<string, string> = {};
		probe.headers.forEach((value, key) => {
			headers[key] = value;
		});
		const buffer = probe.body ? Buffer.from(await probe.arrayBuffer()) : undefined;
		const decision = await unintercepted(
			async () =>
				await decide()({
					method: probe.method.toUpperCase(),
					url: new URL(probe.url),
					headers,
					body: buffer && buffer.length > 0 ? buffer : undefined,
				}),
		);
		return decision === 'passthrough' ? await original(input, init) : decision;
	};
}

/**
 * Wraps `http`, `https` and global `fetch`. A call made inside a guarded node tool goes to `decide`.
 * Any other call is not touched. Returns a function that restores the originals.
 */
export function installNetInterceptor(decide: RequestDecider): () => void {
	if (installed) {
		installed.decide = decide;
	} else {
		const originals: Originals = {
			httpRequest: http.request,
			httpGet: http.get,
			httpsRequest: https.request,
			httpsGet: https.get,
			fetch: globalThis.fetch,
		};
		const state = { decide, originals };
		installed = state;
		const current = () => state.decide;
		const httpRequest = patchedRequest(http, originals.httpRequest, current);
		const httpsRequest = patchedRequest(https, originals.httpsRequest, current);
		// `get` is `request` plus `end()`. The built-in `get` does not call the patched `request`.
		const asGet = (request: (...args: unknown[]) => http.ClientRequest) => {
			return (...args: unknown[]): http.ClientRequest => {
				const req = request(...args);
				req.end();
				return req;
			};
		};
		http.request = httpRequest;
		http.get = asGet(httpRequest);
		https.request = httpsRequest;
		https.get = asGet(httpsRequest);
		globalThis.fetch = patchedFetch(originals.fetch, current);
	}

	return () => {
		if (!installed) return;
		const { originals } = installed;
		http.request = originals.httpRequest;
		http.get = originals.httpGet;
		https.request = originals.httpsRequest;
		https.get = originals.httpsGet;
		globalThis.fetch = originals.fetch;
		installed = undefined;
	};
}

// Headers that the HTTP client of the copy sets itself.
const SET_BY_CLIENT: ReadonlySet<string> = new Set([
	'host',
	'content-length',
	'connection',
	'keep-alive',
	'transfer-encoding',
	'accept-encoding',
]);

/** Sends a captured request to the real network. Use it inside a decision to make the real read. */
export async function sendToNetwork(req: CapturedRequest): Promise<Response> {
	const headers = Object.fromEntries(
		Object.entries(req.headers).filter(([name]) => !SET_BY_CLIENT.has(name.toLowerCase())),
	);
	return await unintercepted(
		async () =>
			await fetch(req.url, {
				method: req.method,
				headers,
				body:
					req.body && req.method !== 'GET' && req.method !== 'HEAD'
						? new Uint8Array(req.body)
						: undefined,
			}),
	);
}
