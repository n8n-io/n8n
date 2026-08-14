/**
 * Strip raw binary content from request bodies before they reach the LLM
 * prompt. Multipart/form-data uploads and raw Buffer bodies are reduced to
 * structural metadata (part names, content types, filenames, sizes) so the
 * model still understands what was uploaded without ever seeing the bytes.
 *
 * Two failure modes drove this:
 *  1. `JSON.stringify(buffer)` emits `{"type":"Buffer","data":[...]}` —
 *     thousands of integers that blow the prompt budget and leak content.
 *  2. `form-data` library FormData instances have circular `_streams`
 *     references that crash JSON.stringify entirely.
 *
 * Called from mock-handler.ts before `redactSecretKeys` and `truncateForLlm`.
 */

const BINARY_CONTENT_TYPE_RE = /^(?:image|audio|video|application\/(?:pdf|octet-stream|zip))/i;

interface FormDataLike {
	_streams?: unknown[];
	getBoundary?: () => string;
	getLengthSync?: () => number;
	getBuffer?: () => Buffer;
}

interface MultipartPart {
	name?: string;
	filename?: string;
	contentType?: string;
}

function isFormDataLike(value: unknown): value is FormDataLike {
	if (typeof value !== 'object' || value === null) return false;
	const candidate = value as FormDataLike;
	return typeof candidate.getBoundary === 'function' && Array.isArray(candidate._streams);
}

function summarizeFormData(fd: FormDataLike): unknown {
	const parts: MultipartPart[] = [];
	const streams = Array.isArray(fd._streams) ? fd._streams : [];

	for (const entry of streams) {
		if (typeof entry !== 'string') continue;
		// Each header chunk looks like:
		//   --boundary
		//   Content-Disposition: form-data; name="field"; filename="x.png"
		//   Content-Type: image/png
		//
		// We only care about chunks that contain a Content-Disposition.
		if (!entry.includes('Content-Disposition')) continue;
		const nameMatch = /name="([^"]+)"/.exec(entry);
		if (!nameMatch) continue;
		const filenameMatch = /filename="([^"]+)"/.exec(entry);
		const contentTypeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(entry);
		parts.push({
			name: nameMatch[1],
			filename: filenameMatch?.[1],
			contentType: contentTypeMatch?.[1]?.trim(),
		});
	}

	return {
		__redacted: 'multipart',
		boundary: typeof fd.getBoundary === 'function' ? fd.getBoundary() : undefined,
		parts,
	};
}

function summarizeBuffer(buf: Buffer, contentType?: string): unknown {
	return {
		__redacted: 'buffer',
		contentType: contentType ?? 'application/octet-stream',
		size: buf.length,
	};
}

function summarizeString(text: string, contentType: string): unknown {
	return {
		__redacted: 'binary',
		contentType,
		size: Buffer.byteLength(text, 'utf8'),
	};
}

/**
 * Walk a request body and replace any binary content (Buffer, FormData, or
 * raw bytes signalled by content-type) with structural metadata. Plain JSON
 * values pass through untouched.
 */
export function redactBinaryBody(body: unknown, contentType?: string): unknown {
	if (body === null || body === undefined) return body;

	if (Buffer.isBuffer(body)) {
		return summarizeBuffer(body, contentType);
	}

	if (isFormDataLike(body)) {
		return summarizeFormData(body);
	}

	// A string body with a binary content-type is almost always a base64-encoded
	// blob — redact it. Plain JSON / text strings flow through normally.
	if (typeof body === 'string' && contentType && BINARY_CONTENT_TYPE_RE.test(contentType)) {
		return summarizeString(body, contentType);
	}

	if (Array.isArray(body)) {
		return body.map((value) => redactBinaryBody(value));
	}

	if (typeof body === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
			result[key] = redactBinaryBody(value);
		}
		return result;
	}

	return body;
}
