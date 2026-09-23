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

async function* parseEvents(stream: Readable): AsyncIterable<ResponseStreamEvent> {
	for await (const message of parseSSEStream(stream[Symbol.asyncIterator]())) {
		if (!message.data || message.data === '[DONE]') continue;

		const event = jsonParse<ResponseStreamEvent | null>(message.data, { fallbackValue: null });
		if (event) yield event;
	}
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
): Promise<ChatResponse> {
	let response: ChatResponse | undefined;

	for await (const event of parseEvents(stream)) {
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

	if (!response) {
		throw new NodeOperationError(ctx.getNode(), 'The streamed response ended without a result', {
			description: 'The model did not send a completed response. Try again.',
		});
	}

	return response;
}
