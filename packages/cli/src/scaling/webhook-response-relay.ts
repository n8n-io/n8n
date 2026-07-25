/**
 * Moves webhook response bodies between a worker and main in queue mode,
 * keeping a single oversized response from ballooning broker memory.
 */

import type { Logger } from '@n8n/backend-common';
import type { EndpointsConfig } from '@n8n/config';
import type { BinaryData, BinaryDataConfig, BinaryDataService } from 'n8n-core';
import { FileLocation } from 'n8n-core';
import { BINARY_ENCODING, jsonParse, OperationalError } from 'n8n-workflow';
import type {
	IBinaryData,
	IDataObject,
	IExecuteResponsePromiseData,
	IN8nHttpFullResponse,
} from 'n8n-workflow';
import { Readable } from 'node:stream';

/** Sentinel key marking a base64-encoded Buffer body relayed inline through the queue. */
export const ENCODED_BUFFER_KEY = '__@N8nEncodedBuffer@__';

/** Sentinel key marking an offloaded body's original form, so it can be restored. */
export const OFFLOADED_BODY_KIND_KEY = '__@N8nOffloadedBodyKind@__';

/** Stores readable by all instances; in-memory and filesystem are local to one host. */
const SHARED_STORE_MODES: Array<BinaryDataConfig['mode']> = ['database', 's3', 'azure'];

/**
 * Stored modes whose reads stream live from the store. An offloaded body in
 * one of these must sit off the execution's prefix, so an execution hard-delete
 * cannot remove it mid-download. Database rows are buffered fully before
 * streaming, so they ride the execution's lifetime instead.
 */
const OBJECT_STORE_MODES: Array<BinaryDataConfig['mode']> = ['s3', 'azure'];

/** Root path segment for offloaded response bodies kept off the execution prefix. */
const OFFLOADED_RESPONSE_PATH_SEGMENT = 'webhook-responses';

type RelayContext = { workflowId: string; executionId: string };

/** Dependencies the relay's callers inject; the relay itself never touches the DI container. */
export type WebhookResponseRelayDeps = {
	logger: Logger;
	binaryDataService: BinaryDataService;
	binaryDataConfig: BinaryDataConfig;
	endpointsConfig: EndpointsConfig;
};

type OffloadedBodyKind = 'buffer' | 'string' | 'json';

/**
 * An oversized body serialized for the binary-data store, tagged with its
 * original form. `inlineContentType` is the `content-type` Express would set
 * if the body were relayed inline and sent via `res.json`/`res.send`, so a
 * response's headers do not change with its size. Buffers are sent via
 * `res.end`, which sets none.
 */
type SerializedBody = {
	kind: OffloadedBodyKind;
	buffer: Buffer;
	inlineContentType?: string;
};

/**
 * Prepares a worker's webhook response for relay to main.
 *
 * Bodies at or below the configured threshold are relayed inline (Buffers
 * base64-encoded). Larger bodies are offloaded to the binary-data store and
 * replaced with a reference that main streams to the client.
 *
 * @param response Worker response. Mutated and returned.
 * @param ctx Execution the offloaded body is stored under.
 * @returns The same `response`, with any oversized body replaced by a reference.
 *
 * @remarks Offloading needs a binary-data store readable by all instances
 * (`database`, `s3` or `azure` — queue mode defaults to `database`). With
 * in-memory or filesystem storage, or when storing fails, the body is
 * relayed inline regardless of size, preserving prior behavior.
 *
 * An offloaded body is transient: main deletes it once the response has been
 * delivered (see {@link deleteOffloadedWebhookResponseBody} and
 * {@link restoreOffloadedWebhookResponseBody}). Object-store bodies are kept
 * off the execution's prefix so an execution hard-delete cannot remove them
 * mid-download; database bodies ride the execution's lifetime, where reads are
 * buffered before streaming and execution pruning is the cleanup backstop.
 */
export async function prepareWebhookResponseForRelay(
	response: IExecuteResponsePromiseData,
	ctx: RelayContext,
	{ logger, binaryDataService, binaryDataConfig, endpointsConfig }: WebhookResponseRelayDeps,
): Promise<IExecuteResponsePromiseData> {
	if (!isFullResponse(response)) {
		return response;
	}

	if (SHARED_STORE_MODES.includes(binaryDataConfig.mode)) {
		try {
			const maxInlineSizeInBytes = endpointsConfig.webhookResponseOffloadThreshold * 1024 * 1024;
			const oversized = serializeIfOversized(response.body, maxInlineSizeInBytes);
			if (oversized) {
				await offload(
					response,
					oversized,
					offloadLocation(binaryDataConfig.mode, ctx),
					binaryDataService,
				);
				return response;
			}
		} catch (error) {
			logger.warn('Failed to offload large webhook response, relaying it inline', {
				...ctx,
				error,
			});
		}
	}

	if (Buffer.isBuffer(response.body)) {
		response.body = { [ENCODED_BUFFER_KEY]: response.body.toString(BINARY_ENCODING) };
	}

	return response;
}

/**
 * Reverses {@link prepareWebhookResponseForRelay} on main: decodes an inline
 * base64 Buffer envelope back into a Buffer. Offloaded bodies (binary-data
 * references) and plain bodies are left untouched, since main streams those
 * from storage separately.
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

/**
 * Reverses an offload: fetches the stored body and restores it to its
 * original form (Buffer, string, or parsed JSON). Non-offloaded bodies are
 * left untouched. For consumers that need the body itself rather than a
 * stream, e.g. a sub-workflow tool reading the response.
 *
 * On a successful restore the stored body is deleted, since this consumer
 * reads it once and never streams it again.
 *
 * @param response Relayed response. Mutated and returned.
 * @returns The same `response`, with an offloaded body restored. When fetching
 * fails, an empty body of the original kind is substituted (never the internal
 * reference), the stored body is left for its backstop, and a warning logged.
 */
export async function restoreOffloadedWebhookResponseBody(
	response: IExecuteResponsePromiseData,
	{ logger, binaryDataService }: Pick<WebhookResponseRelayDeps, 'logger' | 'binaryDataService'>,
): Promise<IExecuteResponsePromiseData> {
	if (!isFullResponse(response)) {
		return response;
	}

	const offloaded = asOffloadedBody(response.body);
	if (!offloaded) {
		return response;
	}

	try {
		const buffer = await binaryDataService.getAsBuffer(offloaded.binaryData);
		response.body = deserializeBody(buffer, offloaded.kind);
	} catch (error) {
		logger.warn('Failed to restore offloaded webhook response body', { error });
		response.body = emptyBodyOf(offloaded.kind);
		return response;
	}

	await deleteStoredBody(offloaded.binaryData.id, { logger, binaryDataService });
	return response;
}

/**
 * Deletes an offloaded response body from the store once main has delivered it.
 * A no-op for bodies that were never offloaded, so it is safe to call for every
 * response-node response. Read-only; the response is not mutated.
 *
 * @remarks Storage failures are swallowed and logged: the response has already
 * been delivered, and a body left behind is reclaimed by execution pruning
 * (database) or store lifecycle rules (object stores).
 */
export async function deleteOffloadedWebhookResponseBody(
	response: IExecuteResponsePromiseData,
	deps: Pick<WebhookResponseRelayDeps, 'logger' | 'binaryDataService'>,
): Promise<void> {
	if (!isFullResponse(response)) {
		return;
	}

	const offloaded = asOffloadedBody(response.body);
	if (offloaded) {
		await deleteStoredBody(offloaded.binaryData.id, deps);
	}
}

async function deleteStoredBody(
	binaryDataId: string | undefined,
	{ logger, binaryDataService }: Pick<WebhookResponseRelayDeps, 'logger' | 'binaryDataService'>,
): Promise<void> {
	if (binaryDataId) {
		try {
			await binaryDataService.deleteManyByBinaryDataId([binaryDataId]);
		} catch (error) {
			logger.warn('Failed to delete offloaded webhook response body', { error });
		}
	}
}

/**
 * Where an offloaded body is stored. Object stores keep it off the execution's
 * prefix so an execution hard-delete cannot remove it mid-download; database
 * bodies ride the execution's lifetime, where reads are buffered before
 * streaming and execution pruning is the cleanup backstop.
 */
function offloadLocation(
	mode: BinaryDataConfig['mode'],
	ctx: RelayContext,
): BinaryData.FileLocation {
	return OBJECT_STORE_MODES.includes(mode)
		? FileLocation.ofCustom({ pathSegments: [OFFLOADED_RESPONSE_PATH_SEGMENT, ctx.executionId] })
		: FileLocation.ofExecution(ctx.workflowId, ctx.executionId);
}

/**
 * Stores the serialized body and replaces it with a reference. When the
 * response has no `content-type` header, sets the one the body would have
 * received inline, keeping headers independent of body size.
 *
 * @throws When the configured store does not persist the body, leaving the
 * body untouched for the caller to relay inline.
 */
async function offload(
	response: IN8nHttpFullResponse,
	{ kind, buffer, inlineContentType }: SerializedBody,
	location: BinaryData.FileLocation,
	binaryDataService: BinaryDataService,
): Promise<void> {
	const existingContentType = contentTypeOf(response.headers);
	const contentType = existingContentType ?? inlineContentType;

	const stored = await binaryDataService.store(location, buffer, {
		data: '',
		mimeType: contentType ?? 'application/octet-stream',
		fileName: 'webhook-response',
	});
	if (!stored.id) {
		throw new OperationalError('Binary-data store did not persist the response body');
	}

	if (contentType !== undefined && existingContentType === undefined) {
		response.headers ??= {};
		response.headers['content-type'] = contentType;
	}
	response.body = { binaryData: stored, [OFFLOADED_BODY_KIND_KEY]: kind };
}

function isFullResponse(response: IExecuteResponsePromiseData): response is IN8nHttpFullResponse {
	return typeof response === 'object' && response !== null && 'body' in response;
}

/**
 * Serializes a body for offloading, but only if it exceeds `maxBytes`: sizes
 * are checked before any copy, and JSON is stringified once. Returns
 * `undefined` for bodies within the limit and for bodies the relay never
 * offloads (streams, existing binary-data references, null).
 */
function serializeIfOversized(
	body: IN8nHttpFullResponse['body'],
	maxBytes: number,
): SerializedBody | undefined {
	if (Buffer.isBuffer(body)) {
		return body.length > maxBytes ? { kind: 'buffer', buffer: body } : undefined;
	}

	if (typeof body === 'string') {
		return Buffer.byteLength(body) > maxBytes
			? { kind: 'string', buffer: Buffer.from(body), inlineContentType: 'text/html; charset=utf-8' }
			: undefined;
	}

	if (isJsonObject(body)) {
		const json = JSON.stringify(body);
		return Buffer.byteLength(json) > maxBytes
			? {
					kind: 'json',
					buffer: Buffer.from(json),
					inlineContentType: 'application/json; charset=utf-8',
				}
			: undefined;
	}

	return undefined;
}

/** Restores a stored body to the form {@link serializeIfOversized} captured. */
function deserializeBody(buffer: Buffer, kind: OffloadedBodyKind): IN8nHttpFullResponse['body'] {
	switch (kind) {
		case 'buffer':
			return buffer;
		case 'string':
			return buffer.toString('utf8');
		case 'json':
			return jsonParse<IDataObject>(buffer.toString('utf8'));
	}
}

/** An empty body of the given kind, substituted when a stored body can't be fetched. */
function emptyBodyOf(kind: OffloadedBodyKind): IN8nHttpFullResponse['body'] {
	switch (kind) {
		case 'buffer':
			return Buffer.alloc(0);
		case 'string':
			return '';
		case 'json':
			return {};
	}
}

/** The base64 payload of an {@link ENCODED_BUFFER_KEY} envelope, if the body is one. */
function encodedBufferIn(body: IN8nHttpFullResponse['body']): string | undefined {
	if (typeof body !== 'object' || body === null || !(ENCODED_BUFFER_KEY in body)) {
		return undefined;
	}
	const encoded = body[ENCODED_BUFFER_KEY];
	return typeof encoded === 'string' ? encoded : undefined;
}

/**
 * Narrows a body to an offload marker produced by {@link prepareWebhookResponseForRelay}.
 * A binary-data reference without the kind marker is a genuine binary
 * response, not an offloaded one, and is never restored.
 */
function asOffloadedBody(
	body: IN8nHttpFullResponse['body'],
): { binaryData: IBinaryData; kind: OffloadedBodyKind } | undefined {
	if (!isBinaryDataReference(body)) {
		return undefined;
	}
	const kind = body[OFFLOADED_BODY_KIND_KEY];
	if (kind === 'buffer' || kind === 'string' || kind === 'json') {
		return { binaryData: body.binaryData, kind };
	}
	return undefined;
}

function isJsonObject(body: IN8nHttpFullResponse['body']): body is IDataObject {
	return (
		typeof body === 'object' &&
		body !== null &&
		!Buffer.isBuffer(body) &&
		!(body instanceof Readable) &&
		!isBinaryDataReference(body)
	);
}

function isBinaryDataReference(body: unknown): body is IDataObject & { binaryData: IBinaryData } {
	if (typeof body !== 'object' || body === null || !('binaryData' in body)) {
		return false;
	}
	const { binaryData } = body;
	return (
		typeof binaryData === 'object' &&
		binaryData !== null &&
		'id' in binaryData &&
		typeof binaryData.id === 'string'
	);
}

function contentTypeOf(headers: IN8nHttpFullResponse['headers']): string | undefined {
	const entry = Object.entries(headers ?? {}).find(
		([name]) => name.toLowerCase() === 'content-type',
	);
	return typeof entry?.[1] === 'string' ? entry[1] : undefined;
}
