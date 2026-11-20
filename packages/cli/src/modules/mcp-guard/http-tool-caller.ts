import http from 'node:http';
import https from 'node:https';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { UnexpectedError } from '@n8n/errors';

import type { McpCaller } from './mcp-upstream';
import type { CapturedRequest } from './network';
import { REDACTED_SECRET } from './path-secret';

/**
 * The hydration code is written for tools: a name, args, a result. An HTTP request is turned into one,
 * so that the plan hydrator can work on it unchanged. The name tells the kind (`read_` or `write_`),
 * and the args are the request.
 */
export interface HttpToolArgs extends Record<string, unknown> {
	method: string;
	path: string;
	query?: Record<string, string | string[]>;
	body?: unknown;
}

// Parts of a path that carry no meaning for a tool name.
const NOISE_SEGMENTS: ReadonlySet<string> = new Set(['users', 'me', 'gmail', 'api']);
const VERSION_SEGMENT = /^v\d+$/;
// An id has a digit and is not a short word.
export const looksLikeId = (segment: string): boolean => segment.length >= 8 && /\d/.test(segment);

function describePath(method: string, pathname: string): string {
	const segments = pathname.split('/').filter((s) => s !== '');
	const nouns = segments.filter(
		(s) =>
			!looksLikeId(s) &&
			!VERSION_SEGMENT.test(s) &&
			!NOISE_SEGMENTS.has(s) &&
			!s.includes(REDACTED_SECRET),
	);
	if (method === 'GET' || method === 'HEAD') {
		const last = segments[segments.length - 1];
		const one = last !== undefined && looksLikeId(last);
		return `${one ? 'get' : 'list'}_${nouns.join('_') || 'root'}`;
	}
	return `${method.toLowerCase()}_${nouns.join('_') || 'root'}`;
}

function parseBody(body: Buffer | undefined): unknown {
	if (!body || body.length === 0) return undefined;
	const text = body.toString('utf8');
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

export function toToolCall(
	req: Pick<CapturedRequest, 'method' | 'url' | 'body'>,
	readShaped: boolean,
): { name: string; args: HttpToolArgs } {
	const method = req.method.toUpperCase();
	const query: Record<string, string | string[]> = {};
	for (const [key, value] of req.url.searchParams) {
		const known = query[key];
		query[key] = known === undefined ? value : [...(Array.isArray(known) ? known : [known]), value];
	}
	const body = parseBody(req.body);
	return {
		name: `${readShaped ? 'read' : 'write'}_${describePath(method, req.url.pathname)}`,
		args: {
			method,
			path: req.url.pathname,
			...(Object.keys(query).length > 0 && { query }),
			...(body !== undefined && { body }),
		},
	};
}

/** Only a tool that `toToolCall` named as a read can reach the real service. */
export const isReadToolName: { has(name: string): boolean } = {
	has: (name) => name.startsWith('read_'),
};

export function fromToolArgs(
	origin: string,
	args: HttpToolArgs,
	headers: Record<string, string>,
): CapturedRequest {
	// A path is relative to the origin. An absolute URL would send the node credential to another host.
	if (!args.path.startsWith('/') || args.path.startsWith('//') || args.path.includes('\\')) {
		throw new UnexpectedError('mcp-guard: the path of a call must be relative');
	}
	const url = new URL(args.path, origin);
	if (url.origin !== new URL(origin).origin) {
		throw new UnexpectedError('mcp-guard: the call leaves the host of the request');
	}
	for (const [key, value] of Object.entries(args.query ?? {})) {
		for (const item of Array.isArray(value) ? value : [value]) url.searchParams.append(key, item);
	}
	const method = args.method.toUpperCase();
	const out: Record<string, string> = Object.fromEntries(
		Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
	);
	let body: Buffer | undefined;
	if (method !== 'GET' && method !== 'HEAD' && args.body !== undefined) {
		if (typeof args.body === 'string') {
			body = Buffer.from(args.body);
		} else {
			body = Buffer.from(JSON.stringify(args.body));
			out['content-type'] = 'application/json';
		}
	}
	return { method, url, headers: out, body };
}

export interface HttpToolCallerOptions {
	// Where the paths of the args point to, such as `https://www.googleapis.com`. A function is read at call time.
	origin: string | (() => string);
	send: (req: CapturedRequest) => Promise<Response>;
	// Read at call time, so a refreshed token is used.
	headers: () => Record<string, string>;
	// Changes a JSON answer before it becomes the text of the result.
	enrich?: (json: unknown) => unknown;
	// Checks the request that the args make, before it is sent. The args come from a model.
	allow?: (req: CapturedRequest) => boolean;
}

/** A tool caller that sends HTTP requests. The result is the body as text, `_meta` holds the status. */
export function createHttpToolCaller(options: HttpToolCallerOptions): McpCaller {
	return {
		listTools: async () => [],
		callTool: async (_name, args): Promise<CallToolResult> => {
			const req = fromToolArgs(
				typeof options.origin === 'function' ? options.origin() : options.origin,
				args as HttpToolArgs,
				options.headers(),
			);
			if (options.allow && !options.allow(req)) {
				throw new UnexpectedError('mcp-guard: this call is not allowed');
			}
			const res = await options.send(req);
			let text = await res.text();
			if (options.enrich) {
				try {
					text = JSON.stringify(options.enrich(JSON.parse(text)));
				} catch {
					// Not JSON, or nothing to add. Keep the body as it is.
				}
			}
			return {
				isError: res.status >= 400,
				content: [{ type: 'text', text }],
				_meta: { status: res.status, contentType: res.headers.get('content-type') ?? undefined },
			};
		},
	};
}

// Headers that the client of the copy sets, and the credential of the real service.
const NOT_FORWARDED: ReadonlySet<string> = new Set([
	'authorization',
	'cookie',
	'proxy-authorization',
	'x-api-key',
	'x-goog-api-key',
	'host',
	'content-length',
	'connection',
	'keep-alive',
	'transfer-encoding',
	'accept-encoding',
]);
const NO_BODY_STATUS: ReadonlySet<number> = new Set([204, 205, 304]);

/**
 * Sends a captured request to the gym. The gym finds the vendor by the Host header, so the request
 * keeps its host. The credential of the real service is dropped and the token of the tenant is set.
 */
export function createGymSender(options: {
	gymUrl: string;
	bearer: () => string;
}): (req: CapturedRequest) => Promise<Response> {
	const target = new URL(options.gymUrl);
	const lib = target.protocol === 'https:' ? https : http;
	return async (req) =>
		await new Promise<Response>((resolve, reject) => {
			const headers: Record<string, string> = {};
			for (const [name, value] of Object.entries(req.headers)) {
				if (!NOT_FORWARDED.has(name.toLowerCase())) headers[name] = value;
			}
			headers.host = req.url.host;
			headers.authorization = `Bearer ${options.bearer()}`;
			if (req.body) headers['content-length'] = String(req.body.length);
			const request = lib.request(
				{
					hostname: target.hostname,
					port: target.port,
					path: req.url.pathname + req.url.search,
					method: req.method,
					headers,
				},
				(res) => {
					const chunks: Buffer[] = [];
					res.on('data', (chunk: Buffer) => chunks.push(chunk));
					res.on('error', reject);
					res.on('end', () => {
						const status = res.statusCode ?? 502;
						const responseHeaders = new Headers();
						const type = res.headers['content-type'];
						if (type) responseHeaders.set('content-type', type);
						resolve(
							new Response(NO_BODY_STATUS.has(status) ? null : Buffer.concat(chunks), {
								status,
								headers: responseHeaders,
							}),
						);
					});
				},
			);
			request.on('error', reject);
			request.end(req.body);
		});
}
