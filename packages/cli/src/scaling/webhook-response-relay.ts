/**
 * Moves webhook response bodies from a worker back to main in scaling mode.
 *
 * A relayed body travels inline inside a single queue message, so its size
 * bounds what the queue must hold while that message is processed.
 */

import { jsonSizeExceeds } from '@n8n/utils/json/json-size-exceeds';
import { BINARY_ENCODING, UserError } from 'n8n-workflow';
import type { IDataObject, IExecuteResponsePromiseData, IN8nHttpFullResponse } from 'n8n-workflow';
import { Readable } from 'node:stream';

/** Sentinel key marking a base64-encoded Buffer body relayed inline through the queue. */
export const ENCODED_BUFFER_KEY = '__@N8nEncodedBuffer@__';

/**
 * Asserts that a payload is small enough to be relayed through the queue.
 *
 * @throws UserError When the payload exceeds `maxSizeInMiB`.
 *
 * @remarks The whole payload counts, headers included, the body and the rest
 * being measured separately, each against the limit. The size measured is a
 * lower bound on that of the queue message carrying the payload: a Buffer body
 * counts base64-encoded, the form it travels in, but the envelope around it and
 * the exact serialization of JSON content are not counted. Under-reporting keeps
 * a payload from ever being rejected for a size it does not have.
 */
export function assertRelayableSize(
	payload: IExecuteResponsePromiseData,
	maxSizeInMiB: number,
): void {
	if (exceedsRelayableSize(payload, maxSizeInMiB * 1024 * 1024)) {
		throw new UserError(
			`The response is too large to be sent back from the worker (over ${maxSizeInMiB} MiB)`,
			{
				description:
					'In scaling mode a response is relayed to the main instance through the queue, which limits how large it can be. Respond with binary data to have the payload streamed from storage instead, or raise N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX.',
			},
		);
	}
}

/** Whether any part of the payload would serialize to more than `maxBytes`. */
function exceedsRelayableSize(payload: IExecuteResponsePromiseData, maxBytes: number): boolean {
	if (!isFullResponse(payload)) {
		return exceedsSize(payload, maxBytes);
	}

	const { body, ...rest } = payload;
	return exceedsSize(body, maxBytes) || jsonSizeExceeds(rest, maxBytes);
}

/** Whether the body would serialize to more than `maxBytes`. */
function exceedsSize(body: IN8nHttpFullResponse['body'], maxBytes: number): boolean {
	if (Buffer.isBuffer(body)) {
		return base64Size(body.length) > maxBytes;
	}

	if (typeof body === 'string') {
		return Buffer.byteLength(body) > maxBytes;
	}

	if (isJsonObject(body)) {
		return jsonSizeExceeds(body, maxBytes);
	}

	return false;
}

function base64Size(byteLength: number): number {
	return Math.ceil(byteLength / 3) * 4;
}

function isJsonObject(body: IN8nHttpFullResponse['body']): body is IDataObject {
	return (
		typeof body === 'object' &&
		body !== null &&
		!Buffer.isBuffer(body) &&
		!(body instanceof Readable)
	);
}

/**
 * Prepares a worker's webhook response for relay to main:
 * - a Buffer body is base64-encoded
 * - every other body passes through untouched.
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
