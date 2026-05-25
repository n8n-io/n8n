import type { EvalMockHttpResponse } from 'n8n-core';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { extractToolCalls, type NormalizedToolCall } from './openai-envelope';

// Translation between the OpenAI Responses API (`/v1/responses`) wire format
// and the shape `createLlmMockHandler` consumes/emits. The Responses API is
// what `@langchain/openai` v1.3+ auto-routes to for newer chat models — the
// chat-completions path covered by `openai-envelope.ts` is no longer the
// default for v1.3+ Agent workflows.

const OPENAI_RESPONSES_SYNTHETIC_URL = 'https://api.openai.com/v1/responses';

const DEFAULT_MODEL = 'gpt-4o-mini';

/** Same as `reverseTranslateOpenAiRequest` but for the Responses API endpoint. */
export function reverseTranslateOpenAiResponsesRequest(body: unknown): IHttpRequestOptions {
	return {
		url: OPENAI_RESPONSES_SYNTHETIC_URL,
		method: 'POST',
		body: body ?? {},
	};
}

/** Pull `.model` from the body; identical fallback to the chat-completions translator. */
export function extractResponsesRequestModel(body: unknown): string {
	if (typeof body !== 'object' || body === null) return DEFAULT_MODEL;
	const model = (body as { model?: unknown }).model;
	return typeof model === 'string' && model.length > 0 ? model : DEFAULT_MODEL;
}

/** True when the inbound Responses API request opted into streaming via `stream: true`. */
export function isResponsesStreamRequested(body: unknown): boolean {
	if (typeof body !== 'object' || body === null) return false;
	return (body as { stream?: unknown }).stream === true;
}

/**
 * Wrap the mock handler's response in a canonical `response` envelope.
 * The Responses API uses a single `output` array — each entry is either a
 * `message` (assistant text) or a `function_call` (tool call). Mixing both
 * in one response is legal but rare; tool-call mode replaces the message.
 */
export function forwardTranslateToResponsesEnvelope(
	mockResponse: EvalMockHttpResponse | undefined,
	model: string,
): Record<string, unknown> {
	const toolCalls = extractToolCalls(mockResponse?.body);
	const responseId = `resp_${randomUUID().replace(/-/g, '').slice(0, 32)}`;
	const now = Math.floor(Date.now() / 1000);

	const output =
		toolCalls.length > 0
			? toolCallsToResponsesOutput(toolCalls)
			: [buildAssistantMessage(extractResponsesContent(mockResponse?.body))];

	return {
		id: responseId,
		object: 'response',
		created_at: now,
		status: 'completed',
		model,
		output,
		// Mirror chat-completions: zero counts make eval cost trackers happy.
		usage: {
			input_tokens: 0,
			output_tokens: 0,
			total_tokens: 0,
		},
		// `previous_response_id`, `instructions`, `metadata` are intentionally
		// omitted — the SDK tolerates missing optional fields, and a stub
		// fingerprint isn't part of the Responses API envelope.
	};
}

/**
 * Stream the mock response as a sequence of Responses API SSE events.
 * Mirrors what the real API emits for a non-tool-call turn:
 *
 *   response.created
 *   response.in_progress
 *   response.output_item.added (message)
 *   response.content_part.added
 *   response.output_text.delta
 *   response.output_text.done
 *   response.content_part.done
 *   response.output_item.done
 *   response.completed
 *
 * For tool calls the message item is replaced by a `function_call` item with
 * `response.function_call_arguments.delta` / `.done` events. Each event
 * frame is encoded as `event: <name>\ndata: <JSON>\n\n`.
 *
 * Implemented as a flat array of `{ event, data }` pairs so callers can
 * iterate deterministically and tests can snapshot the full sequence.
 */
export function forwardTranslateToResponsesSseEvents(
	mockResponse: EvalMockHttpResponse | undefined,
	model: string,
): Array<{ event: string; data: Record<string, unknown> }> {
	const responseId = `resp_${randomUUID().replace(/-/g, '').slice(0, 32)}`;
	const createdAt = Math.floor(Date.now() / 1000);
	const toolCalls = extractToolCalls(mockResponse?.body);

	const baseResponse = (status: string, output: unknown[]) => ({
		id: responseId,
		object: 'response',
		created_at: createdAt,
		status,
		model,
		output,
		usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
	});

	const events: Array<{ event: string; data: Record<string, unknown> }> = [];

	events.push({ event: 'response.created', data: { response: baseResponse('in_progress', []) } });
	events.push({
		event: 'response.in_progress',
		data: { response: baseResponse('in_progress', []) },
	});

	if (toolCalls.length > 0) {
		// Pre-build the final output items so the `id` is stable across every
		// event the SDK reconciles — `output_item.added`, `function_call_-
		// arguments.delta/done`, `output_item.done`, and the terminal
		// `response.completed.output[i]` all reference the same `fc_<uuid>`.
		// Earlier the terminal envelope re-ran the synthesizer and emitted a
		// different id, breaking SDK consumers that key by `id`.
		const finalItems = toolCallsToResponsesOutput(toolCalls);
		toolCalls.forEach((tc, callIndex) => {
			const finalItem = finalItems[callIndex];
			const itemId = finalItem.id as string;
			const initialItem = { ...finalItem, arguments: '' };
			events.push({
				event: 'response.output_item.added',
				data: { output_index: callIndex, item: initialItem },
			});
			if (tc.arguments.length > 0) {
				events.push({
					event: 'response.function_call_arguments.delta',
					data: {
						item_id: itemId,
						output_index: callIndex,
						delta: tc.arguments,
					},
				});
			}
			events.push({
				event: 'response.function_call_arguments.done',
				data: {
					item_id: itemId,
					output_index: callIndex,
					arguments: tc.arguments,
				},
			});
			events.push({
				event: 'response.output_item.done',
				data: { output_index: callIndex, item: finalItem },
			});
		});
		events.push({
			event: 'response.completed',
			data: { response: baseResponse('completed', finalItems) },
		});
		return events;
	}

	// Plain message mode.
	const content = extractResponsesContent(mockResponse?.body);
	const messageId = `msg_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
	// `annotations: []` is required by the OpenAI SDK on every output_text
	// content part — the LangChain extractor calls `.annotations.map(...)`
	// while pulling citations. Omitting it on the terminal `output_item.done`
	// or `response.completed.output[]` would crash consumers downstream.
	const messageItem = {
		id: messageId,
		type: 'message' as const,
		role: 'assistant' as const,
		content: [{ type: 'output_text' as const, text: content, annotations: [] }],
		status: 'completed' as const,
	};
	events.push({
		event: 'response.output_item.added',
		data: {
			output_index: 0,
			item: {
				...messageItem,
				content: [{ type: 'output_text', text: '', annotations: [] }],
				status: 'in_progress',
			},
		},
	});
	events.push({
		event: 'response.content_part.added',
		data: {
			item_id: messageId,
			output_index: 0,
			content_index: 0,
			part: { type: 'output_text', text: '', annotations: [] },
		},
	});
	if (content.length > 0) {
		events.push({
			event: 'response.output_text.delta',
			data: {
				item_id: messageId,
				output_index: 0,
				content_index: 0,
				delta: content,
			},
		});
	}
	events.push({
		event: 'response.output_text.done',
		data: {
			item_id: messageId,
			output_index: 0,
			content_index: 0,
			text: content,
		},
	});
	events.push({
		event: 'response.content_part.done',
		data: {
			item_id: messageId,
			output_index: 0,
			content_index: 0,
			part: { type: 'output_text', text: content, annotations: [] },
		},
	});
	events.push({
		event: 'response.output_item.done',
		data: { output_index: 0, item: messageItem },
	});
	events.push({
		event: 'response.completed',
		data: { response: baseResponse('completed', [messageItem]) },
	});

	return events;
}

/** Responses API uses the same error envelope as chat-completions, with `error.type` describing the failure. */
export function buildResponsesErrorEnvelope(message: string): Record<string, unknown> {
	return {
		error: {
			message,
			type: 'eval_wire_server_error',
			code: 'eval_mock_generation_failed',
			param: null,
		},
	};
}

function toolCallsToResponsesOutput(
	toolCalls: NormalizedToolCall[],
): Array<Record<string, unknown>> {
	return toolCalls.map((tc) => ({
		id: `fc_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
		type: 'function_call',
		call_id: tc.id,
		name: tc.name,
		arguments: tc.arguments,
	}));
}

function buildAssistantMessage(text: string): Record<string, unknown> {
	return {
		id: `msg_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
		type: 'message',
		role: 'assistant',
		status: 'completed',
		// `annotations: []` is required by the OpenAI SDK's `ResponseOutputText` type;
		// LangChain calls `.annotations.map(...)` while extracting citations, and an
		// undefined value throws `Cannot read properties of undefined (reading 'map')`.
		content: [{ type: 'output_text', text, annotations: [] }],
	};
}

/**
 * Pull assistant content out of the mock handler's body. Same tolerant shape
 * detection as the chat-completions path, plus Responses-API-native shapes:
 *   - `{ output: [{ content: [{ text: '...' }] }] }` — already-shaped envelope
 *   - `{ output_text: '...' }` — convenience field some SDKs surface
 * Falls back to the chat-completions extractor's logic for `{ content }`,
 * `{ message }`, bare strings, and stringified unknown shapes.
 */
function extractResponsesContent(body: unknown): string {
	if (body === null || body === undefined) return '';
	if (typeof body === 'string') return body;
	if (typeof body !== 'object') return String(body as number | boolean | bigint);

	const obj = body as Record<string, unknown>;

	if (typeof obj.output_text === 'string') return obj.output_text;

	const output = obj.output;
	if (Array.isArray(output) && output.length > 0) {
		for (const item of output) {
			if (typeof item !== 'object' || item === null) continue;
			const content = (item as { content?: unknown }).content;
			if (!Array.isArray(content) || content.length === 0) continue;
			const first: unknown = content[0];
			if (typeof first === 'object' && first !== null) {
				const text = (first as { text?: unknown }).text;
				if (typeof text === 'string') return text;
			}
		}
	}

	if (typeof obj.content === 'string') return obj.content;
	if (typeof obj.message === 'string') return obj.message;

	return JSON.stringify(body);
}
