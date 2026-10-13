import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

const VISIBLE_ASCII = /^[\x21-\x7E]+$/;
const MAX_KEY_LENGTH = 128;

const IDEMPOTENT_POST_SEGMENTS = new Set([
	'activate',
	'deactivate',
	'publish',
	'unpublish',
	'archive',
	'unarchive',
	'transfer',
	'test',
	'test-trace',
]);

const rawBodies = new WeakMap<IncomingMessage, string>();

export type ParsedIdempotencyKey =
	| { kind: 'absent' }
	| { kind: 'invalid' }
	| { kind: 'present'; value: string };

export function rememberRawBody(req: IncomingMessage, body: Buffer): void {
	rawBodies.set(req, body.toString(req.encoding || 'utf8'));
}

export function parseIdempotencyKey(header: string | string[] | undefined): ParsedIdempotencyKey {
	if (header === undefined) return { kind: 'absent' };
	if (Array.isArray(header)) return { kind: 'invalid' };

	const value = header.trim();
	if (value.length === 0) return { kind: 'absent' };
	if (value.length > MAX_KEY_LENGTH || !VISIBLE_ASCII.test(value)) return { kind: 'invalid' };

	return { kind: 'present', value };
}

export function honorsIdempotencyKey(method: string, path: string): boolean {
	if (method.toUpperCase() !== 'POST') return false;

	const pathname = path.split('?')[0] ?? path;
	const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
	const segment = trimmed.split('/').pop() ?? '';

	return !IDEMPOTENT_POST_SEGMENTS.has(segment);
}

export function fingerprintParts(parts: {
	method: string;
	path: string;
	query: string;
	body: string;
}): string {
	return createHash('sha256')
		.update(parts.method.toUpperCase())
		.update('\n')
		.update(parts.path)
		.update('\n')
		.update(parts.query)
		.update('\n')
		.update(parts.body)
		.digest('hex');
}

export function requestFingerprint(
	req: IncomingMessage & { body?: unknown; originalUrl?: string },
): string {
	const target = req.originalUrl || req.url || '';
	const queryIndex = target.indexOf('?');
	const path = queryIndex === -1 ? target : target.slice(0, queryIndex);
	const query = queryIndex === -1 ? '' : target.slice(queryIndex + 1);

	return fingerprintParts({
		method: req.method ?? 'POST',
		path,
		query,
		body: requestBodyText(req),
	});
}

function requestBodyText(req: IncomingMessage & { body?: unknown }): string {
	const remembered = rawBodies.get(req);
	if (remembered !== undefined) return remembered;

	if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
		return req.rawBody.toString(req.encoding || 'utf8');
	}

	if (req.body === undefined || req.body === null) return '';
	if (typeof req.body === 'string') return req.body;
	if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');

	return JSON.stringify(req.body);
}
