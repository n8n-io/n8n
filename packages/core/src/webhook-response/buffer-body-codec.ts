import type { IN8nHttpFullResponse } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

/**
 * Sentinel key that marks a base64-encoded Buffer body sent inline through a
 * JSON transport. `JSON.stringify` turns a bare Buffer into
 * `{ type: 'Buffer', data: [...] }`, so a Buffer body has to be wrapped before
 * it is serialized and unwrapped after it is parsed.
 */
export const ENCODED_BUFFER_KEY = '__@N8nEncodedBuffer@__';

/**
 * Replaces a Buffer body with its base64 envelope. Any other body passes through.
 *
 * @param response Full response. Mutated and returned.
 * @returns The same `response`.
 */
export function encodeBufferBody<T extends IN8nHttpFullResponse>(response: T): T {
	if (Buffer.isBuffer(response.body)) {
		response.body = { [ENCODED_BUFFER_KEY]: response.body.toString(BINARY_ENCODING) };
	}

	return response;
}

/**
 * Reverses the base64 envelope, restoring a Buffer body. Every other value
 * passes through, a payload that is not a full response included.
 *
 * @param response Parsed payload. Mutated and returned.
 * @returns The same `response`.
 */
export function decodeBufferBody<T>(response: T): T {
	if (!hasResponseBody(response)) {
		return response;
	}

	const encoded = encodedBufferIn(response.body);
	if (encoded !== undefined) {
		response.body = Buffer.from(encoded, BINARY_ENCODING);
	}

	return response;
}

function hasResponseBody(response: unknown): response is IN8nHttpFullResponse {
	return typeof response === 'object' && response !== null && 'body' in response;
}

/** The base64 payload of an {@link ENCODED_BUFFER_KEY} envelope, if the body is one. */
function encodedBufferIn(body: IN8nHttpFullResponse['body']): string | undefined {
	if (typeof body !== 'object' || body === null || !(ENCODED_BUFFER_KEY in body)) {
		return undefined;
	}

	const encoded = body[ENCODED_BUFFER_KEY];
	return typeof encoded === 'string' ? encoded : undefined;
}
