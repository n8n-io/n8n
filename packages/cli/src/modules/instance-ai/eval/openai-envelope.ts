import type { EvalMockHttpResponse } from 'n8n-core';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

/**
 * Translation layer between the OpenAI chat-completions wire format and the
 * shape `createLlmMockHandler` consumes / emits. The wire server uses these
 * helpers on every request:
 *
 *   inbound POST body  →  reverseTranslateOpenAiRequest  →  mock handler
 *   mock handler reply →  forwardTranslateToChatCompletion → response body
 *
 * The translators are deliberately tolerant — the LLM may return a fully
 * shaped chat.completion, a bare `{ content: "..." }` object, or a raw
 * string, and the forward translator coerces all three into the canonical
 * envelope the live `openai` v5 SDK accepts without quirks.
 *
 * SSE / `tool_calls` envelopes land in TRUST-115 (M3) — this file owns the
 * non-streaming, no-tools subset only.
 */

/**
 * The URL the reverse translator stamps onto the synthetic request. Kept
 * identical to OpenAI's real endpoint so `mock-handler.ts`'s
 * `extractServiceName` / `extractEndpoint` derive the right service +
 * endpoint context for prompt assembly.
 */
const OPENAI_SYNTHETIC_URL = 'https://api.openai.com/v1/chat/completions';

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Synthesize an `IHttpRequestOptions` from the inbound OpenAI request body
 * so the mock handler treats vendor SDK traffic identically to traffic that
 * arrives through n8n's HTTP helper. The body is passed through verbatim
 * (messages, tools, temperature, response_format, …) — the LLM-prompt
 * builder relies on seeing the full shape, not a curated subset.
 */
export function reverseTranslateOpenAiRequest(body: unknown): IHttpRequestOptions {
	return {
		url: OPENAI_SYNTHETIC_URL,
		method: 'POST',
		body: body ?? {},
	};
}

/**
 * Pull the model name out of an inbound request body, with a fallback for
 * SDK clients that omit it (rare, but Azure-style proxies sometimes do).
 */
export function extractRequestModel(body: unknown): string {
	if (typeof body !== 'object' || body === null) return DEFAULT_MODEL;
	const model = (body as { model?: unknown }).model;
	return typeof model === 'string' && model.length > 0 ? model : DEFAULT_MODEL;
}

/**
 * Wrap the mock handler's response in a canonical chat.completion envelope.
 * Always re-emits the outer fields (`id`, `created`, `usage`,
 * `system_fingerprint`) — the LLM occasionally omits them when it does
 * produce a chat.completion-shaped body, and the live SDK rejects those
 * with opaque parser errors.
 */
export function forwardTranslateToChatCompletion(
	mockResponse: EvalMockHttpResponse | undefined,
	model: string,
): Record<string, unknown> {
	const content = extractAssistantContent(mockResponse?.body);
	const finishReason = extractFinishReason(mockResponse?.body);

	return {
		id: `chatcmpl-${randomUUID()}`,
		object: 'chat.completion',
		created: Math.floor(Date.now() / 1000),
		model,
		choices: [
			{
				index: 0,
				message: { role: 'assistant', content },
				finish_reason: finishReason,
			},
		],
		// Zero counts are a sentinel for "no real metering" — a stubbed
		// `{ prompt_tokens: 1, completion_tokens: 1 }` would compute as
		// plausible-but-fictional cost in any downstream cost tracker. The
		// `openai` v5 SDK accepts zeros without quirks.
		usage: {
			prompt_tokens: 0,
			completion_tokens: 0,
			total_tokens: 0,
		},
		system_fingerprint: 'eval-wire-server',
	};
}

/**
 * Build an OpenAI-style error envelope. The wire server returns this with
 * a non-200 status when mock generation fails so the SDK throws a typed
 * APIError instead of choking on a malformed body.
 */
export function buildOpenAiErrorEnvelope(message: string): Record<string, unknown> {
	return {
		error: {
			message,
			type: 'eval_wire_server_error',
			param: null,
			code: 'eval_mock_generation_failed',
		},
	};
}

function extractAssistantContent(body: unknown): string {
	if (body === null || body === undefined) return '';
	if (typeof body === 'string') return body;
	if (typeof body !== 'object') return String(body);

	const obj = body as Record<string, unknown>;

	// chat.completion shape — pull the first assistant message's content.
	const choices = obj.choices;
	if (Array.isArray(choices) && choices.length > 0) {
		const first = choices[0];
		if (typeof first === 'object' && first !== null) {
			const message = (first as { message?: unknown }).message;
			if (typeof message === 'object' && message !== null) {
				const inner = (message as { content?: unknown }).content;
				if (typeof inner === 'string') return inner;
			}
		}
	}

	// `{ content: "..." }` — the common "wrap me" shorthand.
	if (typeof obj.content === 'string') return obj.content;

	// `{ message: "..." }` — another shorthand the LLM sometimes emits.
	if (typeof obj.message === 'string') return obj.message;

	// Stringify the whole body so the consumer sees *something* — silently
	// emitting an empty assistant turn would mask mock-handler bugs.
	return JSON.stringify(body);
}

function extractFinishReason(body: unknown): string {
	if (typeof body !== 'object' || body === null) return 'stop';
	const choices = (body as { choices?: unknown }).choices;
	if (Array.isArray(choices) && choices.length > 0) {
		const first = choices[0];
		if (typeof first === 'object' && first !== null) {
			const reason = (first as { finish_reason?: unknown }).finish_reason;
			if (typeof reason === 'string' && reason.length > 0) return reason;
		}
	}
	return 'stop';
}
