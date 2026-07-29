/**
 * Moves webhook response bodies from a worker back to main in scaling mode.
 *
 * A relayed body travels inline inside a single queue message, so its size is
 * the broker's memory exposure while that message is processed.
 */

import { BINARY_ENCODING } from 'n8n-workflow';
import type { IExecuteResponsePromiseData, IN8nHttpFullResponse } from 'n8n-workflow';

/** Sentinel key marking a base64-encoded Buffer body relayed inline through the queue. */
export const ENCODED_BUFFER_KEY = '__@N8nEncodedBuffer@__';

/**
 * Prepares a worker's webhook response for relay to main: a Buffer body is
 * base64-encoded, every other body passes through untouched.
 *
 * @param response Worker response. Mutated and returned.
 * @returns The same `response`, with a Buffer body wrapped in a base64 envelope.
 */
export function prepareWebhookResponseForRelay(
	response: IExecuteResponsePromiseData,
): IExecuteResponsePromiseData {
	if (!isFullResponse(response)) {
		return response;
	}

	if (Buffer.isBuffer(response.body)) {
		response.body = { [ENCODED_BUFFER_KEY]: response.body.toString(BINARY_ENCODING) };
	}

	return response;
}

/**
 * Reverses {@link prepareWebhookResponseForRelay} on main, decoding a base64
 * envelope back into a Buffer. Every other body passes through untouched.
 *
 * @param response Relayed response. Mutated and returned.
 * @returns The same `response`, with an encoded-buffer body restored to a Buffer.
 */
export function decodeRelayedWebhookResponse(
	response: IExecuteResponsePromiseData,
): IExecuteResponsePromiseData {
	if (!isFullResponse(response)) {
		return response;
	}

	const encoded = encodedBufferIn(response.body);
	if (encoded !== undefined) {
		response.body = Buffer.from(encoded, BINARY_ENCODING);
	}

	return response;
}

function isFullResponse(response: IExecuteResponsePromiseData): response is IN8nHttpFullResponse {
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
