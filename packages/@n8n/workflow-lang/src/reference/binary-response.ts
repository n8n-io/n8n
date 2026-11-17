/**
 * `responseBinary` of the `http` effect (spec 7.1) for the reference runner and the test VM.
 *
 * The runtime streams the body of a 2xx response to the binary data store of n8n and gives a
 * handle. Here the store is the fixture: the id of a handle holds the SHA-256 of the bytes, so a
 * test can compare the stored bytes without a store.
 */
import { createHash } from 'node:crypto';

import { MIME_TABLE } from '../generated/mime-table.generated.ts';

/** The marker that n8n writes in `data` of an entry whose bytes are in its file system store. */
export const STORE_MODE = 'filesystem-v2';
const REFERENCE_FILE_PREFIX = `${STORE_MODE}:workflows/reference/executions/reference/binary_data/`;

/** The largest size that has a size text here. `pretty-bytes` rounds a logarithm above it. */
const MAX_SIZE = 1_000_000_000_000;

/** A binary value: metadata and the id of the stored bytes. The bytes are never in the JSON. */
export interface BinaryHandle {
	id: string;
	data: string;
	mimeType: string;
	fileType?: string;
	fileName?: string;
	fileExtension?: string;
	fileSize: string;
	bytes: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The bytes of a fixture body: `{ $base64 }` is decoded, text is UTF-8, other values are JSON text. */
export function fixtureBytes(body: unknown): Buffer {
	if (isRecord(body) && typeof body.$base64 === 'string')
		return Buffer.from(body.$base64, 'base64');
	if (typeof body === 'string') return Buffer.from(body, 'utf8');
	return Buffer.from(JSON.stringify(body ?? null), 'utf8');
}

/** The SHA-256 of the bytes of a handle that this module made, or undefined for another id. */
export function referenceHash(id: unknown): string | undefined {
	if (typeof id !== 'string' || !id.startsWith(REFERENCE_FILE_PREFIX)) return undefined;
	return id.slice(REFERENCE_FILE_PREFIX.length);
}

/** `extension(type)` of mime-types: the first extension of the type, or ''. */
export function mimeExtension(type: string): string {
	const token = /^\s*([^;\s]*)(?:;|\s|$)/.exec(type)?.[1].toLowerCase() ?? '';
	if (token === '' || token.includes('|') || token.includes(',')) return '';
	const at = MIME_TABLE.indexOf(`\n${token}|`);
	if (at < 0) return '';
	const from = at + token.length + 2;
	return MIME_TABLE.slice(from, MIME_TABLE.indexOf('|', from));
}

/** The base name and the extension of a path, as `path.parse` of Node.js gives them for POSIX. */
export function pathParts(path: string): { dir: string; base: string; ext: string } {
	if (path === '/') return { dir: '/', base: '', ext: '' };
	let end = path.length;
	while (end > 1 && path.charAt(end - 1) === '/') end -= 1;
	const cut = path.lastIndexOf('/', end - 1);
	const base = path.slice(cut + 1, end);
	const dot = base.lastIndexOf('.');
	const ext = dot <= 0 || base === '..' ? '' : base.slice(dot + 1);
	return { dir: cut > 0 ? path.slice(0, cut) : cut === 0 ? '/' : '', base, ext };
}

/** `lookup(path)` of mime-types: the type of the extension of the path, or ''. */
export function mimeLookup(path: string): string {
	const extension = pathParts(`x.${path}`).ext.toLowerCase();
	if (extension === '' || extension.includes(',') || extension.includes('|')) return '';
	const at = MIME_TABLE.indexOf(`,${extension},`);
	if (at < 0) return '';
	const start = MIME_TABLE.lastIndexOf('\n', at) + 1;
	return MIME_TABLE.slice(start, MIME_TABLE.indexOf('|', start));
}

/** `fileTypeFromMimeType` of n8n-workflow. */
export function fileTypeOf(mimeType: string): string | undefined {
	if (mimeType.startsWith('application/json')) return 'json';
	if (mimeType.startsWith('text/html')) return 'html';
	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType.startsWith('audio/')) return 'audio';
	if (mimeType.startsWith('video/')) return 'video';
	if (mimeType.startsWith('text/') || mimeType.startsWith('application/javascript')) return 'text';
	if (mimeType.startsWith('application/pdf')) return 'pdf';
	return undefined;
}

/** The size text that n8n writes in `fileSize` (`pretty-bytes` 5.6 with its defaults). */
export function prettyBytes(count: number): string {
	if (!Number.isInteger(count) || count < 0 || count >= MAX_SIZE)
		throw new Error(`A file of ${count} bytes has no size text.`);
	if (count < 1) return '0 B';
	const exponent = count < 1e3 ? 0 : count < 1e6 ? 1 : count < 1e9 ? 2 : 3;
	const scaled = count / [1, 1e3, 1e6, 1e9][exponent];
	const text = scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0);
	return `${Number(text)} ${['B', 'kB', 'MB', 'GB'][exponent]}`;
}

function percentDecoded(text: string): string | undefined {
	try {
		return decodeURIComponent(text);
	} catch {
		return undefined;
	}
}

/**
 * The file name of a `Content-Disposition` header, by the rules of n8n's `parseContentDisposition`:
 * a header without `attachment` or `inline` at its start is read as its parameters; a quoted value
 * loses its quotes and is percent-decoded when it can be; `filename*` wins, and its value is the
 * text after the second `'`.
 */
export function contentDispositionFileName(header: string): string | undefined {
	if (header === '') return undefined;
	const full =
		header.startsWith('attachment') || header.startsWith('inline')
			? header
			: `attachment; ${header}`;
	const parameters: Record<string, string> = {};
	for (const parameter of full.split(';').slice(1)) {
		const at = parameter.indexOf('=');
		if (at === -1) continue;
		let value = parameter.slice(at + 1).trim();
		if (value.startsWith('"') && value.endsWith('"')) {
			value = value.slice(1, -1);
			value = percentDecoded(value) ?? value;
		} else {
			const decoded = percentDecoded(value);
			if (decoded !== undefined)
				value = decoded.startsWith('"') && decoded.endsWith('"') ? decoded.slice(1, -1) : decoded;
		}
		parameters[parameter.slice(0, at).toLowerCase().trim()] = value;
	}
	const wide = parameters['filename*'];
	if (wide) return wide.split("'")[2];
	return parameters.filename;
}

function headerOf(headers: unknown, name: string): string {
	if (!isRecord(headers)) return '';
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === name && typeof value === 'string') return value;
	}
	return '';
}

function urlPath(url: unknown): string | undefined {
	if (typeof url !== 'string') return undefined;
	try {
		return new URL(url).pathname.slice(1);
	} catch {
		return undefined;
	}
}

/**
 * The names of a handle (spec 7.1). File name: the option, else `Content-Disposition`, else the
 * path of the URL. MIME type: the option, else the type of `Content-Type` in lower case, else the
 * type of the extension of the file name, else `text/plain`. These are the rules of n8n's
 * `prepareBinaryData` for a response.
 */
export function handleNames(
	request: { url?: unknown; fileName?: unknown; mimeType?: unknown },
	headers: unknown,
): Pick<BinaryHandle, 'mimeType' | 'fileType' | 'fileName' | 'fileExtension'> {
	const given = typeof request.fileName === 'string' ? request.fileName : '';
	const path =
		given ||
		contentDispositionFileName(headerOf(headers, 'content-disposition')) ||
		urlPath(request.url) ||
		'';
	const mimeType =
		(typeof request.mimeType === 'string' ? request.mimeType : '') ||
		headerOf(headers, 'content-type').split(';')[0].toLowerCase() ||
		mimeLookup(path) ||
		'text/plain';
	const parts = path === '' ? undefined : pathParts(path);
	const fileType = fileTypeOf(mimeType);
	const fileExtension = parts?.ext || mimeExtension(mimeType);
	return {
		mimeType,
		...(fileType === undefined ? {} : { fileType }),
		...(parts === undefined ? {} : { fileName: parts.base }),
		...(fileExtension === '' ? {} : { fileExtension }),
	};
}

/** The texts of a list of a rule: an array of strings, or one string with commas between them. */
function texts(value: unknown): string[] {
	if (typeof value === 'string') return value.split(',');
	return Array.isArray(value) ? value.filter((text) => typeof text === 'string') : [];
}

/**
 * The rule of `responseBinary` (spec 7.1): without `storeTypes` each body is stored. With it, a
 * body is stored when the content type has one text of `storeTypes` and no text of `inlineTypes`.
 */
function ruleStores(options: Record<string, unknown>, contentType: string): boolean {
	if (options.storeTypes === undefined) return true;
	if (texts(options.inlineTypes).some((text) => contentType.includes(text))) return false;
	return texts(options.storeTypes).some((text) => contentType.includes(text));
}

/**
 * The result of an `http` effect. With `responseBinary` and a 2xx status, the body becomes
 * `{ $binary: <handle> }`; any other result is returned as it is. A rule in `responseBinary`
 * keeps the body of a response of another content type as it is.
 */
export function storedResponse(kind: string, args: unknown, result: unknown): unknown {
	if (kind !== 'http' || !isRecord(args) || !isRecord(args.responseBinary)) return result;
	if (!isRecord(result) || '$error' in result) return result;
	const status = typeof result.status === 'number' ? result.status : 200;
	if ((status < 200 || status > 299) && args.responseBinary.anyStatus !== true) return result;
	if (!ruleStores(args.responseBinary, headerOf(result.headers, 'content-type'))) return result;
	const bytes = fixtureBytes(result.body);
	const handle: BinaryHandle = {
		id: REFERENCE_FILE_PREFIX + createHash('sha256').update(bytes).digest('hex'),
		data: STORE_MODE,
		...handleNames(
			args.responseBinary.storeTypes === undefined
				? { url: args.url, ...args.responseBinary }
				: { url: args.url },
			result.headers,
		),
		fileSize: prettyBytes(bytes.length),
		bytes: bytes.length,
	};
	return { ...result, body: { $binary: handle } };
}
