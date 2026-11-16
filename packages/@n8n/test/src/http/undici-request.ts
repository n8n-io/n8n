import type { HttpRequest } from './http-request';
import { toHeaderRecord } from './http-request';

export interface UndiciRequest {
	origin: string | URL;
	path: string;
	method: string;
	headers?: unknown;
	body?: unknown;
	error?: unknown;
}

export function isUndiciMessage(message: unknown): message is { request: UndiciRequest } {
	if (typeof message !== 'object' || message === null || !('request' in message)) return false;
	const { request } = message;
	return (
		typeof request === 'object' &&
		request !== null &&
		'origin' in request &&
		(typeof request.origin === 'string' || request.origin instanceof URL) &&
		'path' in request &&
		typeof request.path === 'string' &&
		'method' in request &&
		typeof request.method === 'string'
	);
}

export function toHttpRequest(request: UndiciRequest, url: URL): HttpRequest {
	const { body } = request;
	return {
		method: request.method,
		url: url.href,
		headers: toHeaderRecord(headerEntries(request.headers)),
		body:
			typeof body === 'string' || body instanceof Uint8Array ? Buffer.from(body).toString() : '',
	};
}

function headerEntries(headers: unknown): Array<[string, unknown]> {
	if (typeof headers === 'string') return headers.split('\r\n').flatMap(toHeaderLine);
	if (!Array.isArray(headers)) return [];
	return headers.flatMap((name: unknown, index) =>
		index % 2 === 0 ? [[String(name), headers[index + 1]]] : [],
	);
}

function toHeaderLine(line: string): Array<[string, string]> {
	const separator = line.indexOf(':');
	if (separator === -1) return [];
	return [[line.slice(0, separator), line.slice(separator + 1).trim()]];
}
