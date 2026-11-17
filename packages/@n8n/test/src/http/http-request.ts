import type { ClientRequest } from 'node:http';

import type { ExecutionSetup, NodeRunRecord } from '../execution-context';

export interface HttpRequest {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string;
}

export function recordRequest(record: NodeRunRecord, request: HttpRequest) {
	record.requests.push(request);
}

export function recordClientRequest(context: ExecutionSetup, message: unknown) {
	const record = context.runs.open.at(-1)?.record;
	if (!record || !isClientRequestMessage(message)) return;
	captureClientRequest(message.request, (request) => recordRequest(record, request));
}

function captureClientRequest(request: ClientRequest, onEnd: (request: HttpRequest) => void) {
	const chunks: Buffer[] = [];
	const { write, end } = request;
	request.write = (...args: unknown[]) => {
		chunks.push(...toChunk(args));
		return Reflect.apply(write, request, args) === true;
	};
	request.end = (...args: unknown[]) => {
		chunks.push(...toChunk(args));
		onEnd({
			method: request.method,
			url: `${request.protocol}//${String(request.getHeader('host') ?? request.host)}${request.path}`,
			headers: toHeaderRecord(Object.entries(request.getHeaders())),
			body: Buffer.concat(chunks).toString(),
		});
		Reflect.apply(end, request, args);
		return request;
	};
}

function toChunk([chunk, encoding]: unknown[]): Buffer[] {
	if (typeof chunk === 'string') {
		return [
			Buffer.from(
				chunk,
				typeof encoding === 'string' && Buffer.isEncoding(encoding) ? encoding : 'utf8',
			),
		];
	}
	if (chunk instanceof Uint8Array) return [Buffer.from(chunk)];
	return [];
}

export function toHeaderRecord(entries: Array<[string, unknown]>): Record<string, string> {
	return Object.fromEntries(
		entries.map(([name, value]) => [
			name.toLowerCase(),
			Array.isArray(value) ? value.join(', ') : String(value),
		]),
	);
}

function isClientRequestMessage(message: unknown): message is { request: ClientRequest } {
	if (typeof message !== 'object' || message === null || !('request' in message)) return false;
	const { request } = message;
	return typeof request === 'object' && request !== null && 'getHeaders' in request;
}
