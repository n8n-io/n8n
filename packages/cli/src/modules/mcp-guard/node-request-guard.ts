import { Readable } from 'node:stream';
import { Container } from '@n8n/di';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { IHttpRequestOptions } from 'n8n-workflow';

import type { HydrationModel } from './hydration-llm';
import type { CapturedRequest } from './network';

const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

const isStream = (body: unknown): boolean =>
	typeof body === 'object' &&
	body !== null &&
	typeof (body as { pipe?: unknown }).pipe === 'function';

function toUrl(options: IHttpRequestOptions): URL {
	const base = options.baseURL?.replace(/\/+$/, '');
	const url = new URL(
		ABSOLUTE_URL.test(options.url) || !base
			? options.url
			: `${base}/${options.url.replace(/^\/+/, '')}`,
	);
	for (const [key, value] of Object.entries(options.qs ?? {})) {
		for (const item of Array.isArray(value) ? value : [value]) {
			if (item !== undefined && item !== null) url.searchParams.append(key, String(item));
		}
	}
	return url;
}

function toHeaders(options: IHttpRequestOptions): Record<string, string> {
	const headers: Record<string, string> = {};
	for (const [name, value] of Object.entries(options.headers ?? {})) {
		if (value !== undefined && value !== null) headers[name.toLowerCase()] = String(value);
	}
	const auth = options.auth;
	if (auth && headers.authorization === undefined) {
		const pair = `${auth.username}:${auth.password}`;
		headers.authorization = `Basic ${Buffer.from(pair).toString('base64')}`;
	}
	return headers;
}

// A stream or a form is not read: the guard sees the request without a body, so it is a write.
function toBody(options: IHttpRequestOptions, headers: Record<string, string>): Buffer | undefined {
	const body = options.body as unknown;
	if (body === undefined || body === null || isStream(body)) return undefined;
	if (Buffer.isBuffer(body)) return body;
	if (typeof body === 'string') return Buffer.from(body);
	if (body instanceof URLSearchParams) return Buffer.from(body.toString());
	if (typeof body !== 'object' || 'getHeaders' in body) return undefined;
	headers['content-type'] ??= 'application/json';
	return Buffer.from(JSON.stringify(body));
}

/** The request of a node, as the guard reads it. */
export function toCapturedRequest(options: IHttpRequestOptions): CapturedRequest {
	const headers = toHeaders(options);
	return {
		method: (options.method ?? 'GET').toUpperCase(),
		url: toUrl(options),
		headers,
		body: toBody(options, headers),
	};
}

// The node reads the answer as bytes. Text would change every byte above 127.
const BINARY_ENCODINGS: ReadonlySet<string | undefined> = new Set([
	'arraybuffer',
	'blob',
	'stream',
]);

async function toMockResponse(
	res: Response,
	encoding: IHttpRequestOptions['encoding'],
	fullResponse: boolean | undefined,
) {
	const headers: Record<string, string> = {};
	res.headers.forEach((value, key) => {
		headers[key] = value;
	});
	if (BINARY_ENCODINGS.has(encoding)) {
		const bytes = Buffer.from(await res.arrayBuffer());
		// A node that asks only for the body of a stream calls `.on()` on it. The core wraps the bytes of a
		// full response itself.
		return {
			statusCode: res.status,
			headers,
			body: encoding === 'stream' && !fullResponse ? Readable.from([bytes]) : bytes,
		};
	}
	const text = await res.text();
	let body: unknown = text;
	if (/json/i.test(res.headers.get('content-type') ?? '')) {
		try {
			body = JSON.parse(text);
		} catch {
			// Not JSON after all. Keep the text.
		}
	}
	return { statusCode: res.status, headers, body };
}

export interface NodeRequestGuardScope {
	model: HydrationModel;
	chatId: string | undefined;
	agentId: string | undefined;
}

/**
 * The guard of one node execution in a test chat. The request helpers of the node ask it just before
 * they send a request: the reads and writes go to the guard, a token exchange goes on to the network.
 */
export function createNodeRequestGuard(scope: NodeRequestGuardScope): EvalLlmMockHandler {
	return async (options) => {
		// Load the guard only when a node tool makes a call. Most chats never do.
		const { HttpGuardService } = await import('./http-guard.service.js');
		const res = await Container.get(HttpGuardService).handle(toCapturedRequest(options), scope);
		return res === undefined
			? undefined
			: await toMockResponse(res, options.encoding, options.returnFullResponse);
	};
}
