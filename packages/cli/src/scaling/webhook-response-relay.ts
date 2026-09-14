/**
 * Moves response bodies from a worker back to main in scaling mode.
 *
 * A small body travels inline inside the queue message.
 *
 * Where offload is enabled:
 * - a larger one is stored in the binary-data store
 * - and replaced with a reference
 * So the size of a response no longer bounds what the queue must hold.
 */

import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { jsonSizeExceeds } from '@n8n/utils/json/json-size-exceeds';
import { BinaryDataConfig, BinaryDataService, FileLocation, FileTooLargeError } from 'n8n-core';
import type { BinaryData } from 'n8n-core';
import { BINARY_ENCODING, jsonParse, OperationalError } from 'n8n-workflow';
import type {
	IBinaryData,
	IDataObject,
	IExecuteResponsePromiseData,
	IN8nHttpFullResponse,
} from 'n8n-workflow';
import { Readable } from 'node:stream';

import { WebhookResponseTooLargeError } from '@/errors/webhook-response-too-large.error';

const MIB = 1024 * 1024;

/** Sentinel key marking a base64-encoded Buffer body relayed inline through the queue. */
export const ENCODED_BUFFER_KEY = '__@N8nEncodedBuffer@__';

/**
 * Sentinel key recording an offloaded body's original form, so it can be restored.
 * It sits on the relayed response, beside `body`, never inside it:
 * - a body's content comes from the workflow
 * - the response envelope only from the relay
 * So only a reference the relay itself stored reads as offloaded.
 */
export const OFFLOADED_BODY_KIND_KEY = '__@N8nOffloadedBodyKind@__';

/**
 * The one mode with nowhere to offload a body to: it keeps bytes in memory, so a
 * body stored in it would travel inline after all.
 *
 * Every other mode has a store, and whether main reaches it is the deployment's to
 * get right: a store only the instance that wrote the body can read surfaces when
 * main reads it back, rather than being refused up front.
 */
const IN_MEMORY_MODE: BinaryDataConfig['mode'] = 'default';

/** What Express sets on a string body sent inline through `res.send`. */
const INLINE_STRING_CONTENT_TYPE = 'text/html; charset=utf-8';

/** What Express sets on a JSON body sent inline through `res.json`. */
const INLINE_JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

const TOO_LARGE_MESSAGE = 'The response is too large to be sent back from the worker';

const TOO_LARGE_FOR_STORE_MESSAGE = 'The response is too large for the binary-data store to hold';

const OFFLOAD_DISABLED_GUIDANCE =
	'In scaling mode a response over this size can be stored for the main instance to stream instead of failing. Set N8N_WEBHOOK_RESPONSE_RELAY_OFFLOAD_ENABLED to true on every worker, once every main instance runs a version that reads a stored body, or raise N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX.';

const BINARY_DATA_DOCS_LINK =
	"<a href='https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/binary-data' target='_blank'>in the docs</a>";

const NO_STORE_GUIDANCE = `In scaling mode a response over this size is stored for the main instance to stream, which the in-memory binary-data mode cannot do. Set N8N_DEFAULT_BINARY_DATA_MODE to a mode with a store, or raise N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX. The modes are described ${BINARY_DATA_DOCS_LINK}.`;

const UNREADABLE_BODY_GUIDANCE = `A response over N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX is stored by the instance that produced it, so N8N_DEFAULT_BINARY_DATA_MODE has to name a store every instance can read. The modes are described ${BINARY_DATA_DOCS_LINK}.`;

const NOT_OFFLOADABLE_GUIDANCE =
	'In scaling mode a response is relayed to the main instance through the queue, which limits how large it can be. Only a response body can be stored for the main instance to stream instead, so raise N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX to relay a payload this large.';

const STORE_LIMIT_GUIDANCE =
	'A response over N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX is stored for the main instance to stream, so the store applies its own size limit above that one. In database mode raise N8N_BINARY_DATA_DATABASE_MAX_FILE_SIZE, up to the 1 GB a database column holds. The filesystem, s3 and azure modes have no such limit, so setting N8N_DEFAULT_BINARY_DATA_MODE to one of those lifts it, as long as every instance reads the same store.';

export type RelayContext = { workflowId: string; executionId: string };

export type RelayReadContext = Partial<RelayContext>;

const OFFLOADED_BODY_KINDS = ['buffer', 'string', 'json'] as const;

type OffloadedBodyKind = (typeof OFFLOADED_BODY_KINDS)[number];

type OffloadedBodyContent = Buffer | string | IDataObject;

type OffloadablePayload = {
	kind: OffloadedBodyKind;
	exceeds: (maxBytes: number) => boolean;
	serialize: () => Buffer;
	inlineContentType?: string;
};

type OffloadedBody = {
	binaryData: IBinaryData & { id: string };
	kind: OffloadedBodyKind;
};

/**
 * A full response that may carry the {@link OFFLOADED_BODY_KIND_KEY} marker.
 *
 * @remarks The marker is typed `unknown` because a relayed response is parsed
 * from the queue message, where nothing constrains what the key holds. Reading
 * it therefore goes through {@link isOffloadedBodyKind}.
 */
type OffloadMarkedResponse = IN8nHttpFullResponse &
	Partial<Record<typeof OFFLOADED_BODY_KIND_KEY, unknown>>;

/**
 * Carries a response body from a worker to main in scaling mode, inline inside
 * the queue message or through the binary-data store.
 */
@Service()
export class WebhookResponseRelay {
	constructor(
		private readonly logger: Logger,
		private readonly binaryDataService: BinaryDataService,
		private readonly binaryDataConfig: BinaryDataConfig,
		private readonly executionsConfig: ExecutionsConfig,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	/**
	 * Prepares a worker's response to travel inside a queue message:
	 * - the body of a response over the size limit is stored and replaced with a
	 *   reference, where offload is enabled
	 * - a Buffer body staying inline is base64-encoded
	 * - and any other body passes through.
	 *
	 * @param response Worker response. Mutated and returned.
	 * @returns The same `response`.
	 *
	 * @throws {WebhookResponseTooLargeError} When:
	 * - the response is over the limit and its body cannot be offloaded,
	 * - or when what is left once the body is offloaded is over the limit on its own,
	 * - or when the response has no offload path and is over the limit as a whole.
	 *
	 * A stream body is the one exception to measuring a whole response: it cannot be
	 * measured without being consumed, so only the rest of the response is asserted on.
	 */
	async prepare(
		response: IExecuteResponsePromiseData,
		context: RelayContext,
	): Promise<IExecuteResponsePromiseData> {
		if (!hasResponseBody(response)) {
			this.assertFitsInline(response);
			return response;
		}

		const { body, ...rest } = response;
		const offloadable = asOffloadablePayload(body);

		if (!offloadable) {
			this.assertFitsInline(body instanceof Readable ? rest : response);
			return response;
		}

		this.assertFitsInline(rest);

		if (!this.exceedsInline(response, offloadable)) {
			return encodeBufferBody(response);
		}

		this.assertOffloadAvailable();

		return await this.offload(response, offloadable, context);
	}

	/**
	 * Replaces an offloaded body with its stored content.
	 * Any other response passes through.
	 *
	 * @param response Relayed response. Mutated and returned.
	 * @param reclaim Whether this caller is the sole reader of the response.
	 * A sole reader deletes the stored body once read, without holding the returned
	 * promise for it, and a body that cannot be fetched fails the delivery it owns.
	 * Where the same relayed response reaches several readers, deleting would strand
	 * the others, and a fetch failure degrades to an empty body of the original form
	 * instead, never the reference itself.
	 * @param context Where the response came from, reported on failure.
	 * @returns The same `response`.
	 * @throws {OperationalError} When `reclaim` is set and the stored content cannot be fetched.
	 */
	async restoreOffloadedBody<T>(
		response: T,
		{ reclaim, context }: { reclaim: boolean; context: RelayReadContext },
	): Promise<T> {
		if (!hasResponseBody(response)) {
			return response;
		}

		const offloaded = asOffloadedBody(response);
		if (!offloaded) {
			return response;
		}

		const binaryDataId = offloaded.binaryData.id;

		try {
			const buffer = await this.binaryDataService.getAsBuffer(offloaded.binaryData);
			response.body = deserializeBody(buffer, offloaded.kind);
		} catch (error) {
			if (reclaim) {
				throw new OperationalError('The stored webhook response body could not be read', {
					cause: error,
					description: UNREADABLE_BODY_GUIDANCE,
					extra: { binaryDataId, ...context },
				});
			}

			return this.degradeToEmptyBody(response, offloaded, context, error);
		}

		clearOffloadMarker(response);

		if (reclaim) {
			void this.deleteStoredBody(binaryDataId, context);
		}

		return response;
	}

	/**
	 * Reclaims the storage of an offloaded body.
	 * A no-op for any other body.
	 *
	 * @param context Where the response came from, reported on failure.
	 *
	 * @remarks Failures are logged rather than thrown: the response has already
	 * been delivered, and a body left behind is reclaimed by execution pruning
	 * (`database`) or by store lifecycle rules (object stores).
	 */
	async deleteOffloadedBody(
		response: IExecuteResponsePromiseData,
		context: RelayReadContext,
	): Promise<void> {
		if (hasResponseBody(response)) {
			const offloaded = asOffloadedBody(response);
			if (offloaded) {
				await this.deleteStoredBody(offloaded.binaryData.id, context);
			}
		}
	}

	/**
	 * Asserts that a payload with no offload path is small enough to travel
	 * inline inside a queue message.
	 *
	 * @throws {WebhookResponseTooLargeError} When the payload is over the limit.
	 */
	assertFitsInline(payload: unknown): void {
		if (exceedsInlineSize(payload, this.maxInlineBytes)) {
			throw new WebhookResponseTooLargeError(TOO_LARGE_MESSAGE, {
				description: withInlineLimit(NOT_OFFLOADABLE_GUIDANCE, this.maxInlineMib),
			});
		}
	}

	/**
	 * Asserts that a body over the limit has somewhere to be offloaded to.
	 *
	 * @throws {WebhookResponseTooLargeError} When offload is turned off, or when the
	 * binary-data mode keeps bytes in memory.
	 */
	private assertOffloadAvailable(): void {
		if (!this.executionsConfig.webhookResponseRelayOffloadEnabled) {
			throw new WebhookResponseTooLargeError(TOO_LARGE_MESSAGE, {
				description: withInlineLimit(OFFLOAD_DISABLED_GUIDANCE, this.maxInlineMib),
			});
		}

		if (this.binaryDataConfig.mode === IN_MEMORY_MODE) {
			throw new WebhookResponseTooLargeError(TOO_LARGE_MESSAGE, {
				description: withInlineLimit(NO_STORE_GUIDANCE, this.maxInlineMib),
			});
		}
	}

	private get maxInlineMib(): number {
		return this.executionsConfig.webhookResponseRelaySizeMaxMiB;
	}

	private get maxInlineBytes(): number {
		return this.maxInlineMib * MIB;
	}

	/**
	 * Whether `response` is too large to travel inline inside a queue message.
	 *
	 * @remarks Measured twice, because neither measure bounds the other: the body
	 * alone, in the form it travels in, which counts a Buffer base64-encoded, and
	 * the whole response as JSON, which adds the headers. The second is an upper
	 * bound, and a loose one over a Buffer body, which serializes as an array of
	 * numbers rather than as base64, so a Buffer may be offloaded below the limit.
	 */
	private exceedsInline(response: IN8nHttpFullResponse, body: OffloadablePayload): boolean {
		return body.exceeds(this.maxInlineBytes) || jsonSizeExceeds(response, this.maxInlineBytes);
	}

	/**
	 * @param response Mutated and returned.
	 *
	 * @throws Whatever storing the body fails with, leaving `response` untouched.
	 *
	 * @remarks A stored body is deliberately absent from run data, unlike a node's
	 * binary data, because its lifetime is a single delivery: it is deleted once
	 * read, so duplicating it to a parent execution would copy bytes already gone,
	 * and counting it towards an execution's binary-data size would report bytes no
	 * reader can fetch. It is still stored under the execution, so that pruning
	 * reclaims a body no reader deleted: pruning deletes a location by prefix, so a
	 * store implementing no prefix deletion leaves that to its lifecycle rules.
	 */
	private async offload(
		response: OffloadMarkedResponse,
		{ kind, serialize, inlineContentType }: OffloadablePayload,
		{ workflowId, executionId }: RelayContext,
	): Promise<OffloadMarkedResponse> {
		const existingContentType = contentTypeOf(response.headers);
		const contentType = existingContentType ?? inlineContentType;
		const location = FileLocation.ofExecution(workflowId, executionId);

		const stored = await this.storeBody(location, serialize(), contentType);

		// Main streams a stored body instead of sending it through `res.json` or
		// `res.send`, so the `content-type` Express would have set has to travel
		// with it, keeping a response's headers independent of its size.
		if (contentType !== undefined && existingContentType === undefined) {
			response.headers ??= {};
			response.headers['content-type'] = contentType;
		}

		response.body = { binaryData: stored };
		response[OFFLOADED_BODY_KIND_KEY] = kind;

		return response;
	}

	/**
	 * @returns The stored body's binary-data reference, its `id` set.
	 * @throws {WebhookResponseTooLargeError} When the store refuses the body for its own size limit.
	 * @throws {OperationalError} When the store reports no id.
	 */
	private async storeBody(
		location: BinaryData.FileLocation,
		body: Buffer,
		contentType: string | undefined,
	): Promise<IBinaryData> {
		let stored: IBinaryData;

		try {
			stored = await this.binaryDataService.store(location, body, {
				data: '',
				mimeType: contentType ?? 'application/octet-stream',
				fileName: 'webhook-response',
			});
		} catch (error) {
			if (error instanceof FileTooLargeError) {
				throw new WebhookResponseTooLargeError(TOO_LARGE_FOR_STORE_MESSAGE, {
					description: withResponseSize(STORE_LIMIT_GUIDANCE, body.length),
					cause: error,
				});
			}

			throw error;
		}

		if (!stored.id) {
			throw new OperationalError('Binary-data store did not persist the webhook response body');
		}

		return stored;
	}

	private degradeToEmptyBody<T extends IN8nHttpFullResponse>(
		response: T,
		offloaded: OffloadedBody,
		context: RelayReadContext,
		error: unknown,
	): T {
		this.logger.warn('Failed to restore an offloaded webhook response body', {
			binaryDataId: offloaded.binaryData.id,
			...context,
			error,
		});

		response.body = emptyBodyOf(offloaded.kind);
		clearOffloadMarker(response);

		return response;
	}

	private async deleteStoredBody(binaryDataId: string, context: RelayReadContext): Promise<void> {
		try {
			await this.binaryDataService.deleteManyByBinaryDataId([binaryDataId]);
		} catch (error) {
			this.logger.warn('Failed to delete an offloaded webhook response body', {
				binaryDataId,
				...context,
				error,
			});
		}
	}
}

/**
 * Reverses the inline base64 envelope on main, restoring a Buffer body. Every
 * other body passes through, an offloaded one included: main streams that from
 * storage rather than materializing it.
 *
 * @param response Relayed response. Mutated and returned.
 * @returns The same `response`.
 */
export function decodeRelayedWebhookResponse<T>(response: T): T {
	if (!hasResponseBody(response)) {
		return response;
	}

	const encoded = encodedBufferIn(response.body);
	if (encoded !== undefined) {
		response.body = Buffer.from(encoded, BINARY_ENCODING);
	}

	return response;
}

function withInlineLimit(guidance: string, limitInMib: number): string {
	return `The limit is ${limitInMib} MiB. ${guidance}`;
}

function withResponseSize(guidance: string, byteLength: number): string {
	const sizeInMib = Math.round((byteLength / MIB) * 100) / 100;
	return `The response is ${sizeInMib} MiB. ${guidance}`;
}

/**
 * Bytes `byteLength` bytes occupy once base64-encoded, the form a Buffer takes to
 * travel inline. Excludes the envelope around it, keeping this a lower bound.
 */
function base64Size(byteLength: number): number {
	return Math.ceil(byteLength / 3) * 4;
}

function encodeBufferBody(response: IN8nHttpFullResponse): IN8nHttpFullResponse {
	if (Buffer.isBuffer(response.body)) {
		response.body = { [ENCODED_BUFFER_KEY]: response.body.toString(BINARY_ENCODING) };
	}

	return response;
}

/**
 * Whether `payload` would serialize to more than `maxBytes` inside a queue
 * message. Everything is measured, offloadable or not — a binary-data-shaped
 * object included. Only a stream is exempt: it cannot be measured without
 * being consumed.
 */
function exceedsInlineSize(payload: unknown, maxBytes: number): boolean {
	const offloadable = asOffloadablePayload(payload);
	if (offloadable) {
		return offloadable.exceeds(maxBytes);
	}

	return !(payload instanceof Readable) && jsonSizeExceeds(payload, maxBytes);
}

function asOffloadablePayload(payload: unknown): OffloadablePayload | undefined {
	if (Buffer.isBuffer(payload)) {
		return {
			kind: 'buffer',
			exceeds: (maxBytes) => base64Size(payload.length) > maxBytes,
			serialize: () => payload,
		};
	}

	if (typeof payload === 'string') {
		return {
			kind: 'string',
			exceeds: (maxBytes) => Buffer.byteLength(payload, 'utf8') > maxBytes,
			serialize: () => Buffer.from(payload, 'utf8'),
			inlineContentType: INLINE_STRING_CONTENT_TYPE,
		};
	}

	if (isPlainJson(payload)) {
		return {
			kind: 'json',
			exceeds: (maxBytes) => jsonSizeExceeds(payload, maxBytes),
			serialize: () => Buffer.from(JSON.stringify(payload), 'utf8'),
			inlineContentType: INLINE_JSON_CONTENT_TYPE,
		};
	}

	return undefined;
}

function deserializeBody(buffer: Buffer, kind: OffloadedBodyKind): OffloadedBodyContent {
	switch (kind) {
		case 'buffer':
			return buffer;
		case 'string':
			return buffer.toString('utf8');
		case 'json':
			return jsonParse<IDataObject>(buffer.toString('utf8'));
	}
}

function emptyBodyOf(kind: OffloadedBodyKind): OffloadedBodyContent {
	switch (kind) {
		case 'buffer':
			return Buffer.alloc(0);
		case 'string':
			return '';
		case 'json':
			return {};
	}
}

function asOffloadedBody(response: IN8nHttpFullResponse): OffloadedBody | undefined {
	if (!isBinaryDataReference(response.body)) {
		return undefined;
	}

	const marked: OffloadMarkedResponse = response;
	const kind = marked[OFFLOADED_BODY_KIND_KEY];
	if (isOffloadedBodyKind(kind)) {
		return {
			binaryData: response.body.binaryData,
			kind,
		};
	}

	return undefined;
}

function isOffloadedBodyKind(value: unknown): value is OffloadedBodyKind {
	return typeof value === 'string' && OFFLOADED_BODY_KINDS.some((kind) => kind === value);
}

function clearOffloadMarker(response: IN8nHttpFullResponse): void {
	const marked: OffloadMarkedResponse = response;
	delete marked[OFFLOADED_BODY_KIND_KEY];
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

function isPlainJson(payload: unknown): payload is IDataObject {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		!Buffer.isBuffer(payload) &&
		!(payload instanceof Readable) &&
		!isBinaryDataReference(payload)
	);
}

function isBinaryDataReference(
	body: unknown,
): body is IDataObject & { binaryData: IBinaryData & { id: string } } {
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
