import { binaryToBuffer } from '@n8n/backend-network';
import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject, IN8nHttpFullResponse } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { Readable } from 'stream';

function asHeaders(value: unknown): IDataObject {
	return isHttpEnvelope(value) ? (value as IDataObject) : {};
}

function isReadableStream(value: unknown): value is Readable {
	return value instanceof Readable;
}

/**
 * A Buffer or stream is an HTTP body, not an envelope.
 * IncomingMessage is a Readable and also has `statusCode`.
 * Do not treat it as a full response wrapper.
 */
function isHttpEnvelope(value: unknown): value is Record<string, unknown> {
	return isRecord(value) && !Buffer.isBuffer(value) && !isReadableStream(value);
}

function getContentType(value: unknown): string {
	if (!isHttpEnvelope(value)) {
		return '';
	}

	const headers = isHttpEnvelope(value.headers)
		? value.headers
		: isHttpEnvelope(value.response)
			? asHeaders(value.response.headers)
			: {};
	const raw = headers['content-type'] ?? headers['Content-Type'];
	return typeof raw === 'string' ? raw.toLowerCase() : '';
}

export function isJsonLikeHttpContentType(contentType: string): boolean {
	if (!contentType) {
		return true;
	}

	return contentType.includes('json') || contentType.startsWith('text/');
}

function parseResponseBody(body: unknown): IN8nHttpFullResponse['body'] {
	if (Buffer.isBuffer(body)) {
		const text = body.toString('utf8');
		return jsonParse(text, { fallbackValue: text });
	}

	if (typeof body === 'string') {
		const trimmed = body.trim();
		if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
			return jsonParse(trimmed, { fallbackValue: body });
		}
	}

	return body as IN8nHttpFullResponse['body'];
}

/**
 * HTTP Request Autodetect sets `useStream: true`.
 * The refresh predicate is synchronous and reads `$response.body`.
 * Consume a JSON-like stream into a Buffer first.
 * This function mutates wrappers in place.
 * A body-only stream is returned as a Buffer.
 */
export async function materializeHttpResponseBody(value: unknown): Promise<unknown> {
	if (!isJsonLikeHttpContentType(getContentType(value))) {
		return value;
	}

	if (isReadableStream(value)) {
		return await binaryToBuffer(value);
	}

	if (!isHttpEnvelope(value)) {
		return value;
	}

	if (isReadableStream(value.body)) {
		value.body = await binaryToBuffer(value.body);
	}

	const nested = value.response;
	if (isHttpEnvelope(nested) && isReadableStream(nested.data)) {
		nested.data = await binaryToBuffer(nested.data);
	}

	return value;
}

/**
 * Normalize a legacy request response, an axios error, or a full n8n HTTP
 * response into `IN8nHttpFullResponse`.
 * `$response` expressions then share one shape.
 */
export function toHttpFullResponse(value: unknown): IN8nHttpFullResponse | undefined {
	if (!isHttpEnvelope(value)) {
		return undefined;
	}

	const nested = value.response;
	if (isHttpEnvelope(nested) && typeof nested.status === 'number') {
		return {
			statusCode: nested.status,
			body: parseResponseBody(nested.data),
			headers: asHeaders(nested.headers),
			statusMessage: typeof nested.statusText === 'string' ? nested.statusText : undefined,
		};
	}

	if (typeof value.statusCode === 'number') {
		return {
			statusCode: value.statusCode,
			body: parseResponseBody(value.body),
			headers: asHeaders(value.headers),
			statusMessage: typeof value.statusMessage === 'string' ? value.statusMessage : undefined,
		};
	}

	return undefined;
}

/**
 * Like `toHttpFullResponse`, but a body-only success value becomes status 200.
 * `$response.body` then works when the caller did not request a full response.
 */
export function toHttpFullResponseOrBody(value: unknown): IN8nHttpFullResponse {
	return (
		toHttpFullResponse(value) ?? {
			statusCode: 200,
			body: parseResponseBody(value),
			headers: {},
		}
	);
}

export function getHttpStatusCode(value: unknown): unknown {
	return toHttpFullResponse(value)?.statusCode;
}
