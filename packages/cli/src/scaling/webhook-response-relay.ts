import { EndpointsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { BinaryDataService, FileLocation } from 'n8n-core';
import { BINARY_ENCODING } from 'n8n-workflow';
import type {
	IBinaryData,
	IDataObject,
	IExecuteResponsePromiseData,
	IN8nHttpFullResponse,
} from 'n8n-workflow';

/** Sentinel key marking a base64-encoded Buffer body relayed inline through the queue. */
export const ENCODED_BUFFER_KEY = '__@N8nEncodedBuffer@__';

type RelayContext = { workflowId: string; executionId: string };

/**
 * Moves webhook response bodies between a worker and main in queue mode,
 * keeping a single oversized response from ballooning broker memory.
 */
@Service()
export class WebhookResponseRelay {
	private readonly maxInlineSizeInBytes: number;

	constructor(
		private readonly binaryDataService: BinaryDataService,
		endpointsConfig: EndpointsConfig,
	) {
		this.maxInlineSizeInBytes = endpointsConfig.webhookResponseOffloadThreshold * 1024 * 1024;
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
	 * @remarks Offloading needs a persisted binary-data mode (queue mode defaults
	 * to `database`). In in-memory mode the body is relayed inline regardless of
	 * size, preserving prior behavior.
	 */
	async prepareResponse(
		response: IExecuteResponsePromiseData,
		ctx: RelayContext,
	): Promise<IExecuteResponsePromiseData> {
		if (!isFullResponse(response)) {
			return response;
		}

		const { body } = response;

		if (Buffer.isBuffer(body)) {
			await this.offloadOrInlineBufferBody(response, body, ctx);
		} else if (typeof body === 'string') {
			await this.offloadWhenTooLarge(
				response,
				Buffer.from(body, 'utf8'),
				'text/plain; charset=utf-8',
				ctx,
			);
		} else if (isJsonBody(body)) {
			await this.offloadWhenTooLarge(
				response,
				Buffer.from(JSON.stringify(body)),
				'application/json',
				ctx,
			);
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

	/** Offloads a large Buffer body, otherwise relays it inline as base64. */
	private async offloadOrInlineBufferBody(
		response: IN8nHttpFullResponse,
		body: Buffer,
		ctx: RelayContext,
	): Promise<void> {
		const offloaded =
			body.length > this.maxInlineSizeInBytes &&
			(await this.offloadToBinaryStore(response, body, 'application/octet-stream', ctx));

		if (!offloaded) {
			response.body = { [ENCODED_BUFFER_KEY]: body.toString(BINARY_ENCODING) };
		}
	}

	private async offloadWhenTooLarge(
		response: IN8nHttpFullResponse,
		buffer: Buffer,
		fallbackMimeType: string,
		ctx: RelayContext,
	): Promise<void> {
		if (buffer.length > this.maxInlineSizeInBytes) {
			await this.offloadToBinaryStore(response, buffer, fallbackMimeType, ctx);
		}
	}

	/**
	 * Stores the body and replaces it with a reference, setting `content-type`
	 * to the response's own type or `fallbackMimeType` when absent.
	 *
	 * @returns `true` on success; `false` when no persisted store is available, in
	 * which case the body is left untouched for the caller to relay inline.
	 */
	private async offloadToBinaryStore(
		response: IN8nHttpFullResponse,
		buffer: Buffer,
		fallbackMimeType: string,
		ctx: RelayContext,
	): Promise<boolean> {
		const mimeType = contentTypeOf(response) ?? fallbackMimeType;
		const binaryData: IBinaryData = { data: '', mimeType, fileName: 'webhook-response' };
		const stored = await this.binaryDataService.store(
			FileLocation.ofExecution(ctx.workflowId, ctx.executionId),
			buffer,
			binaryData,
		);

		if (!stored.id) {
			return false;
		}

		response.headers ??= {};
		const hasContentType = Object.keys(response.headers).some(
			(key) => key.toLowerCase() === 'content-type',
		);
		if (!hasContentType) {
			response.headers['content-type'] = mimeType;
		}
		response.body = { binaryData: stored } as unknown as IDataObject;
		return true;
	}
}

function isFullResponse(response: IExecuteResponsePromiseData): response is IN8nHttpFullResponse {
	return typeof response === 'object' && response !== null && 'body' in response;
}

function contentTypeOf(response: IN8nHttpFullResponse): string | undefined {
	const entry = Object.entries(response.headers ?? {}).find(
		([key]) => key.toLowerCase() === 'content-type',
	);
	return typeof entry?.[1] === 'string' ? entry[1] : undefined;
}

function isJsonBody(body: unknown): boolean {
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
