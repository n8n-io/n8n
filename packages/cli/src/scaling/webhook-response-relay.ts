import { Logger } from '@n8n/backend-common';
import { EndpointsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { BinaryDataConfig, BinaryDataService, FileLocation } from 'n8n-core';
import { BINARY_ENCODING } from 'n8n-workflow';
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

type RelayContext = { workflowId: string; executionId: string };

type OffloadedBodyKind = 'buffer' | 'string' | 'json';

/**
 * The `content-type` Express would set if a body of this kind were relayed
 * inline and sent via `res.json`/`res.send`, so a response's headers do not
 * change with its size. Buffers are sent via `res.end`, which sets none.
 */
function inlineContentTypeOf(kind: OffloadedBodyKind): string | undefined {
	switch (kind) {
		case 'string':
			return 'text/html; charset=utf-8';
		case 'json':
			return 'application/json; charset=utf-8';
		case 'buffer':
			return undefined;
	}
}

/** A body's byte size, with the bytes materialized only if offloading happens. */
type MeasuredBody = {
	kind: OffloadedBodyKind;
	sizeInBytes: number;
	toBuffer: () => Buffer;
};

/**
 * Moves webhook response bodies between a worker and main in queue mode,
 * keeping a single oversized response from ballooning broker memory.
 */
@Service()
export class WebhookResponseRelay {
	private readonly maxInlineSizeInBytes: number;

	private readonly offloadingEnabled: boolean;

	constructor(
		private readonly logger: Logger,
		private readonly binaryDataService: BinaryDataService,
		binaryDataConfig: BinaryDataConfig,
		endpointsConfig: EndpointsConfig,
	) {
		this.maxInlineSizeInBytes = endpointsConfig.webhookResponseOffloadThreshold * 1024 * 1024;
		this.offloadingEnabled = SHARED_STORE_MODES.includes(binaryDataConfig.mode);
	}

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
	 * An offloaded body shares the execution's binary-data lifetime. With
	 * pruning disabled, an unsaved execution is hard-deleted as soon as it
	 * finishes, which can remove the body while a slow client is still
	 * downloading it.
	 */
	async prepareResponse(
		response: IExecuteResponsePromiseData,
		ctx: RelayContext,
	): Promise<IExecuteResponsePromiseData> {
		if (!isFullResponse(response)) {
			return response;
		}

		if (this.offloadingEnabled) {
			try {
				const body = measureBody(response.body);
				if (body && body.sizeInBytes > this.maxInlineSizeInBytes) {
					const offloaded = await this.offloadToBinaryStore(response, body, ctx);
					if (offloaded) {
						return response;
					}
				}
			} catch (error) {
				this.logger.warn('Failed to offload large webhook response, relaying it inline', {
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
	 * Reverses {@link prepareResponse} on main: decodes an inline base64 Buffer
	 * envelope back into a Buffer. Offloaded bodies (binary-data references) and
	 * plain bodies are left untouched, since main streams those from storage
	 * separately.
	 *
	 * @param response Relayed response. Mutated and returned.
	 * @returns The same `response`, with an encoded-buffer body restored to a Buffer.
	 */
	decodeResponse(response: IExecuteResponsePromiseData): IExecuteResponsePromiseData {
		if (
			isFullResponse(response) &&
			typeof response.body === 'object' &&
			response.body !== null &&
			ENCODED_BUFFER_KEY in response.body &&
			typeof response.body[ENCODED_BUFFER_KEY] === 'string'
		) {
			response.body = Buffer.from(response.body[ENCODED_BUFFER_KEY], BINARY_ENCODING);
		}
		return response;
	}

	/**
	 * Reverses an offload: fetches the stored body and restores it to its
	 * original form (Buffer, string, or parsed JSON). Non-offloaded bodies are
	 * left untouched. For consumers that need the body itself rather than a
	 * stream, e.g. a sub-workflow tool reading the response.
	 *
	 * @param response Relayed response. Mutated and returned.
	 * @returns The same `response`, with an offloaded body restored. When
	 * fetching fails, the reference body is left in place and a warning logged.
	 */
	async restoreOffloadedBody(
		response: IExecuteResponsePromiseData,
	): Promise<IExecuteResponsePromiseData> {
		if (!isFullResponse(response)) {
			return response;
		}

		const offloaded = asOffloadedBody(response.body);
		if (!offloaded) {
			return response;
		}

		try {
			const buffer = await this.binaryDataService.getAsBuffer(offloaded.binaryData);
			response.body =
				offloaded.kind === 'buffer'
					? buffer
					: offloaded.kind === 'string'
						? buffer.toString('utf8')
						: (JSON.parse(buffer.toString('utf8')) as IDataObject);
		} catch (error) {
			this.logger.warn('Failed to restore offloaded webhook response body', { error });
		}

		return response;
	}

	/**
	 * Stores the body and replaces it with a reference. When the response has no
	 * `content-type` header, sets the one the body would have received inline,
	 * keeping headers independent of body size.
	 *
	 * @returns `true` on success; `false` when no persisted store is available, in
	 * which case the body is left untouched for the caller to relay inline.
	 */
	private async offloadToBinaryStore(
		response: IN8nHttpFullResponse,
		body: MeasuredBody,
		ctx: RelayContext,
	): Promise<boolean> {
		const inlineContentType = inlineContentTypeOf(body.kind);
		const contentType = contentTypeOf(response) ?? inlineContentType;
		const stored = await this.binaryDataService.store(
			FileLocation.ofExecution(ctx.workflowId, ctx.executionId),
			body.toBuffer(),
			{
				data: '',
				mimeType: contentType ?? 'application/octet-stream',
				fileName: 'webhook-response',
			},
		);

		if (!stored.id) {
			return false;
		}

		if (contentTypeOf(response) === undefined && inlineContentType !== undefined) {
			response.headers ??= {};
			response.headers['content-type'] = inlineContentType;
		}
		response.body = { binaryData: stored, [OFFLOADED_BODY_KIND_KEY]: body.kind };
		return true;
	}
}

function isFullResponse(response: IExecuteResponsePromiseData): response is IN8nHttpFullResponse {
	return typeof response === 'object' && response !== null && 'body' in response;
}

/**
 * Measures a relayable body without copying it: Buffers and strings report
 * their byte length directly, JSON bodies are serialized once and reused.
 * Returns `undefined` for bodies the relay never offloads (streams, existing
 * binary-data references, null).
 */
function measureBody(body: IN8nHttpFullResponse['body']): MeasuredBody | undefined {
	if (Buffer.isBuffer(body)) {
		return {
			kind: 'buffer',
			sizeInBytes: body.length,
			toBuffer: () => body,
		};
	}

	if (typeof body === 'string') {
		return {
			kind: 'string',
			sizeInBytes: Buffer.byteLength(body, 'utf8'),
			toBuffer: () => Buffer.from(body, 'utf8'),
		};
	}

	if (body instanceof Readable) {
		return undefined;
	}

	if (isJsonBody(body)) {
		const json = JSON.stringify(body);
		return {
			kind: 'json',
			sizeInBytes: Buffer.byteLength(json, 'utf8'),
			toBuffer: () => Buffer.from(json, 'utf8'),
		};
	}

	return undefined;
}

function contentTypeOf(response: IN8nHttpFullResponse): string | undefined {
	const entry = Object.entries(response.headers ?? {}).find(
		([key]) => key.toLowerCase() === 'content-type',
	);
	return typeof entry?.[1] === 'string' ? entry[1] : undefined;
}

function isJsonBody(body: unknown): body is IDataObject {
	return typeof body === 'object' && body !== null && !isBinaryDataReference(body);
}

function isBinaryDataReference(body: unknown): boolean {
	return (
		typeof body === 'object' &&
		body !== null &&
		'binaryData' in body &&
		typeof (body as { binaryData?: { id?: unknown } }).binaryData?.id === 'string'
	);
}

/**
 * Narrows a body to an offload marker produced by {@link WebhookResponseRelay.prepareResponse}.
 * A binary-data reference without the kind marker is a genuine binary
 * response, not an offloaded one, and is never restored.
 */
function asOffloadedBody(
	body: IN8nHttpFullResponse['body'],
): { binaryData: IBinaryData; kind: OffloadedBodyKind } | undefined {
	if (!isBinaryDataReference(body)) {
		return undefined;
	}
	const candidate = body as { binaryData: IBinaryData; [OFFLOADED_BODY_KIND_KEY]?: unknown };
	const kind = candidate[OFFLOADED_BODY_KIND_KEY];
	if (kind !== 'buffer' && kind !== 'string' && kind !== 'json') {
		return undefined;
	}
	return { binaryData: candidate.binaryData, kind };
}
