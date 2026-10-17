import { parseSSEStream } from '@n8n/ai-utilities';
import type { IExecuteFunctions } from 'n8n-workflow';
import { jsonParse, NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import type { ChatResponse } from './interfaces';

type ResponseStreamEvent = {
	type?: string;
	response?: ChatResponse;
	/** The `error` event reports the failure at the top level */
	message?: string;
	code?: string;
	/** Some gateways nest the failure instead */
	error?: { message?: string; code?: string };
};

/**
 * Abort the read if the provider sends no bytes for this long. A streamed
 * `/responses` call emits events regularly while the model works, so a long
 * gap means the connection has stalled. Without this deadline a provider that
 * never sends a terminal event would hold the node execution and socket open
 * for ever.
 */
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 60_000;

export interface CollectStreamedResponseOptions {
	/** Execution cancel signal — closes the stream when the execution stops. */
	abortSignal?: AbortSignal;
	/** Idle deadline in milliseconds; defaults to {@link DEFAULT_STREAM_IDLE_TIMEOUT_MS}. */
	idleTimeoutMs?: number;
}

/**
 * Read the raw stream while it stays active. Collects each chunk for the
 * non-SSE fallback, and closes the stream if it stalls or the execution stops.
 */
async function* readActiveStream(
	stream: Readable,
	rawChunks: Buffer[],
	idleTimeoutMs: number,
	abortSignal?: AbortSignal,
): AsyncGenerator<Buffer> {
	let idleTimer: NodeJS.Timeout | undefined;
	const armIdleTimer = () => {
		idleTimer = setTimeout(() => {
			stream.destroy(
				new Error(`The response stream sent no data for ${Math.round(idleTimeoutMs / 1000)}s`),
			);
		}, idleTimeoutMs);
	};

	const onAbort = () => stream.destroy(new Error('The execution was cancelled'));
	if (abortSignal) {
		if (abortSignal.aborted) onAbort();
		else abortSignal.addEventListener('abort', onAbort, { once: true });
	}

	try {
		armIdleTimer();
		for await (const chunk of stream) {
			clearTimeout(idleTimer);
			const buffer = Buffer.from(chunk as Buffer);
			rawChunks.push(buffer);
			yield buffer;
			armIdleTimer();
		}
	} finally {
		clearTimeout(idleTimer);
		abortSignal?.removeEventListener('abort', onAbort);
	}
}

async function* parseEvents(
	source: AsyncIterableIterator<Buffer | Uint8Array>,
): AsyncIterable<ResponseStreamEvent> {
	for await (const message of parseSSEStream(source)) {
		if (!message.data || message.data === '[DONE]') continue;

		const event = jsonParse<ResponseStreamEvent | null>(message.data, { fallbackValue: null });
		if (event) yield event;
	}
}

/** A full `/responses` body carries these fields; an SSE event never does. */
function isChatResponse(value: unknown): value is ChatResponse {
	return typeof value === 'object' && value !== null && ('output' in value || 'status' in value);
}

/** A real response stream is async-iterable; a parsed JSON body is not. */
function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function'
	);
}

/**
 * Turn a full (non-SSE) `/responses` body into a result. A terminal `failed`
 * body is reported as an error so gateway failures do not pass as success.
 */
function finalizeFullBody(ctx: IExecuteFunctions, body: unknown): ChatResponse {
	const parsed =
		typeof body === 'string' || Buffer.isBuffer(body)
			? jsonParse<unknown>(Buffer.isBuffer(body) ? body.toString('utf-8') : body, {
					fallbackValue: null,
				})
			: body;

	if (isChatResponse(parsed)) {
		if (parsed.status === 'failed') {
			throw new NodeApiError(ctx.getNode(), {
				message: parsed.error?.message ?? 'The model failed to answer',
				code: parsed.error?.code ?? null,
			});
		}
		return parsed;
	}

	throw new NodeOperationError(ctx.getNode(), 'The streamed response ended without a result', {
		description: 'The model did not send a completed response. Try again.',
	});
}

/**
 * Reads a streamed `/responses` call and returns the response object that the terminal event
 * carries. The result has the same shape as a non-streamed call, so callers are unaffected.
 *
 * The connection keeps sending events while the model works, which stops proxies from closing
 * a long-running request.
 */
export async function collectStreamedResponse(
	ctx: IExecuteFunctions,
	stream: Readable,
	options: CollectStreamedResponseOptions = {},
): Promise<ChatResponse> {
	const { abortSignal, idleTimeoutMs = DEFAULT_STREAM_IDLE_TIMEOUT_MS } = options;
	let response: ChatResponse | undefined;
	const rawChunks: Buffer[] = [];

	// Some gateways (and the evaluation HTTP mock) ignore `stream: true` and hand
	// back the parsed JSON body instead of an SSE stream. That body is not
	// iterable, so finalize it directly rather than reading it as a stream.
	if (!isAsyncIterable(stream)) {
		return finalizeFullBody(ctx, stream);
	}

	try {
		for await (const event of parseEvents(
			readActiveStream(stream, rawChunks, idleTimeoutMs, abortSignal),
		)) {
			switch (event.type) {
				case 'response.completed':
				case 'response.incomplete':
					response = event.response;
					break;
				case 'response.failed':
					throw new NodeApiError(ctx.getNode(), {
						message: event.response?.error?.message ?? 'The model failed to answer',
					});
				case 'error':
					throw new NodeApiError(ctx.getNode(), {
						message: event.message ?? event.error?.message ?? 'The response stream failed',
						code: event.code ?? event.error?.code ?? null,
					});
				default:
					break;
			}
		}
	} catch (error) {
		// Terminal-event errors already carry node context; keep them as-is.
		if (error instanceof NodeApiError || error instanceof NodeOperationError) throw error;
		// Idle timeout, cancellation, or a socket failure surfaces as a plain
		// Error out of the iterator. Rewrap it so the caller keeps node context.
		throw new NodeOperationError(
			ctx.getNode(),
			error instanceof Error ? error.message : 'The response stream failed',
			{ description: 'The response stream stopped before it completed.' },
		);
	}

	if (response) return response;

	// A stream that ended without a terminal event may still have carried the
	// full JSON body (a gateway that streamed the body verbatim). Parse it.
	const raw = Buffer.concat(rawChunks).toString('utf-8').trim();
	return finalizeFullBody(ctx, raw);
}
