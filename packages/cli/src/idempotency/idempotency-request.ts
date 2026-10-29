import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { isRecord } from '@n8n/utils/is-record';

const VISIBLE_ASCII = /^[\x21-\x7E]+$/;
const MAX_KEY_LENGTH = 128;

const IDEMPOTENT_POST_SEGMENTS = new Set([
	'activate',
	'deactivate',
	'disconnect',
	'publish',
	'unpublish',
	'archive',
	'unarchive',
	'transfer',
	'test',
	'test-trace',
]);

type FingerprintRequest = {
	method?: string;
	url?: string;
	originalUrl?: string;
	body?: unknown;
	files?: unknown;
	rawBody?: Buffer;
	encoding?: BufferEncoding;
};

const rawBodies = new WeakMap<object, string>();

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

export function requestFingerprint(req: FingerprintRequest): string {
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

type UploadedFile = {
	fieldname: string;
	originalname: string;
	size: number;
	buffer?: Buffer;
};

function isUploadedFile(value: unknown): value is UploadedFile {
	if (!isRecord(value)) return false;

	return (
		typeof value.fieldname === 'string' &&
		typeof value.originalname === 'string' &&
		typeof value.size === 'number' &&
		(value.buffer === undefined || Buffer.isBuffer(value.buffer))
	);
}

function listUploadedFiles(files: unknown): UploadedFile[] {
	if (Array.isArray(files)) return files.filter(isUploadedFile);
	if (!isRecord(files)) return [];

	const listed: UploadedFile[] = [];
	for (const value of Object.values(files)) {
		if (Array.isArray(value)) {
			listed.push(...value.filter(isUploadedFile));
		} else if (isUploadedFile(value)) {
			listed.push(value);
		}
	}
	return listed;
}

function uploadedFilesText(files: unknown): string {
	return listUploadedFiles(files)
		.map((file) => {
			const content = createHash('sha256')
				.update(file.buffer ?? Buffer.alloc(0))
				.digest('hex');
			return `${file.fieldname}\n${file.originalname}\n${file.size}\n${content}`;
		})
		.join('\n');
}

function requestBodyText(req: FingerprintRequest): string {
	const remembered = rawBodies.get(req);
	if (remembered !== undefined) return remembered;

	if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
		return req.rawBody.toString(req.encoding || 'utf8');
	}

	const text = parsedBodyText(req.body);
	const files = uploadedFilesText(req.files);
	return files === '' ? text : `${text}\n${files}`;
}

function parsedBodyText(body: unknown): string {
	if (body === undefined || body === null) return '';
	if (typeof body === 'string') return body;
	if (Buffer.isBuffer(body)) return body.toString('utf8');

	return JSON.stringify(body);
}
