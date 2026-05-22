import type { EvalMockHttpResponse } from 'n8n-core';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

// Translation between the OpenAI chat-completions wire format and the shape
// `createLlmMockHandler` consumes/emits. Covers non-streaming, streaming,
// and tool-call emission. The OpenAI SDK is strict about envelope shape —
// keep this in sync with `ChatCompletion` and `ChatCompletionChunk` schemas.

// Kept identical to OpenAI's real URL so mock-handler's service/endpoint
// extraction derives the right prompt-builder context.
const OPENAI_SYNTHETIC_URL = 'https://api.openai.com/v1/chat/completions';

const DEFAULT_MODEL = 'gpt-4o-mini';

/** Tool call extracted from the mock handler's response body. */
export interface NormalizedToolCall {
	id: string;
	name: string;
	arguments: string;
}

/** Synthesize an `IHttpRequestOptions` from the inbound body so vendor-SDK traffic looks identical to HTTP-helper traffic. */
export function reverseTranslateOpenAiRequest(body: unknown): IHttpRequestOptions {
	return {
		url: OPENAI_SYNTHETIC_URL,
		method: 'POST',
		body: body ?? {},
	};
}

/** Pull `.model` from the body; fall back when Azure-style proxies omit it. */
export function extractRequestModel(body: unknown): string {
	if (typeof body !== 'object' || body === null) return DEFAULT_MODEL;
	const model = (body as { model?: unknown }).model;
	return typeof model === 'string' && model.length > 0 ? model : DEFAULT_MODEL;
}

/** True when the inbound request opted into streaming via `stream: true`. */
export function isStreamRequested(body: unknown): boolean {
	if (typeof body !== 'object' || body === null) return false;
	return (body as { stream?: unknown }).stream === true;
}

/** True when the inbound request advertises a non-empty `tools` array. */
export function hasInboundTools(body: unknown): boolean {
	if (typeof body !== 'object' || body === null) return false;
	const tools = (body as { tools?: unknown }).tools;
	return Array.isArray(tools) && tools.length > 0;
}

/** Wrap the mock handler's response in a canonical chat.completion envelope. */
export function forwardTranslateToChatCompletion(
	mockResponse: EvalMockHttpResponse | undefined,
	model: string,
): Record<string, unknown> {
	const toolCalls = extractToolCalls(mockResponse?.body);
	const content = toolCalls.length > 0 ? null : extractAssistantContent(mockResponse?.body);
	// When tool_calls present, finish_reason MUST be 'tool_calls' — SDKs branch on this.
	const finishReason =
		toolCalls.length > 0 ? 'tool_calls' : extractFinishReason(mockResponse?.body);

	const message: Record<string, unknown> = {
		role: 'assistant',
		content,
	};
	if (toolCalls.length > 0) {
		message.tool_calls = toolCalls.map((tc) => ({
			id: tc.id,
			type: 'function' as const,
			function: { name: tc.name, arguments: tc.arguments },
		}));
	}

	return {
		id: `chatcmpl-${randomUUID()}`,
		object: 'chat.completion',
		created: Math.floor(Date.now() / 1000),
		model,
		choices: [
			{
				index: 0,
				message,
				finish_reason: finishReason,
			},
		],
		// Zero counts = "no real metering" — stubbed non-zero would compute
		// as plausible-but-fictional cost in downstream cost trackers.
		usage: {
			prompt_tokens: 0,
			completion_tokens: 0,
			total_tokens: 0,
		},
		system_fingerprint: 'eval-wire-server',
	};
}

/**
 * Stream the mock handler's response as a sequence of `chat.completion.chunk`
 * frames. Output obeys OpenAI's SSE accumulation contract:
 *
 * - `index` is always set on tool-call deltas.
 * - `id` and `function.name` are set only on the FIRST chunk per tool call.
 * - `function.arguments` is streamed as raw JSON characters across chunks.
 * - Content chunks (assistant text) emit `delta.content` slices.
 * - The terminal chunk carries `finish_reason: 'tool_calls'` when any tool
 *   call was emitted, otherwise `finish_reason: 'stop'`.
 *
 * Implemented as an array (not a generator) so callers can iterate
 * deterministically and the test suite can snapshot the full sequence.
 */
export function forwardTranslateToSseChunks(
	mockResponse: EvalMockHttpResponse | undefined,
	model: string,
): Array<Record<string, unknown>> {
	const id = `chatcmpl-${randomUUID()}`;
	const created = Math.floor(Date.now() / 1000);
	const toolCalls = extractToolCalls(mockResponse?.body);

	const chunks: Array<Record<string, unknown>> = [];

	const baseChunk = (delta: Record<string, unknown>, finishReason: string | null = null) => ({
		id,
		object: 'chat.completion.chunk' as const,
		created,
		model,
		choices: [{ index: 0, delta, finish_reason: finishReason }],
		system_fingerprint: 'eval-wire-server',
	});

	// Opening chunk announces the assistant role with no content payload yet —
	// matches what the real API sends so SDK reducers initialize correctly.
	chunks.push(baseChunk({ role: 'assistant', content: toolCalls.length > 0 ? null : '' }));

	if (toolCalls.length > 0) {
		// Tool-call mode: emit each call as a first-chunk-with-name + arg-stream.
		toolCalls.forEach((tc, callIndex) => {
			// First chunk per tool call carries id + name; arguments start empty.
			chunks.push(
				baseChunk({
					tool_calls: [
						{
							index: callIndex,
							id: tc.id,
							type: 'function',
							function: { name: tc.name, arguments: '' },
						},
					],
				}),
			);
			// Stream arguments in slices. Single slice is fine — the SDK
			// accumulates regardless of chunk size, but emitting at least
			// one slice exercises the accumulation path.
			if (tc.arguments.length > 0) {
				chunks.push(
					baseChunk({
						tool_calls: [
							{
								index: callIndex,
								function: { arguments: tc.arguments },
							},
						],
					}),
				);
			}
		});
		// Terminal chunk: empty delta + finish_reason: 'tool_calls'.
		chunks.push(baseChunk({}, 'tool_calls'));
		return chunks;
	}

	// Content mode: emit the full content as one delta then terminate.
	const content = extractAssistantContent(mockResponse?.body);
	if (content.length > 0) {
		chunks.push(baseChunk({ content }));
	}
	const finishReason = extractFinishReason(mockResponse?.body);
	chunks.push(baseChunk({}, finishReason));
	return chunks;
}

/** OpenAI-style error envelope — makes the SDK throw a typed APIError instead of choking on a malformed body. */
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

/**
 * Normalize tool-call shapes the mock handler may emit:
 *   - `{ tool_calls: [{ id, function: { name, arguments } }] }` — OpenAI native.
 *   - `{ tool_calls: [{ name, arguments }] }` — shorthand the LLM often writes.
 *   - `{ choices: [{ message: { tool_calls: [...] } }] }` — already-shaped envelope.
 *   - `{ tool: { name, arguments } }` — single-tool shorthand.
 *
 * Returns an empty array when no tool calls are present. Arguments are
 * coerced to JSON strings (SDKs require string-shaped arguments).
 */
export function extractToolCalls(body: unknown): NormalizedToolCall[] {
	if (typeof body !== 'object' || body === null) return [];
	const obj = body as Record<string, unknown>;

	const fromChoices = pickToolCallsFromChoices(obj);
	if (fromChoices.length > 0) return fromChoices;

	const fromTopLevel = normalizeToolCallList(obj.tool_calls);
	if (fromTopLevel.length > 0) return fromTopLevel;

	if (typeof obj.tool === 'object' && obj.tool !== null) {
		const single = normalizeToolCallList([obj.tool]);
		if (single.length > 0) return single;
	}

	return [];
}

function pickToolCallsFromChoices(obj: Record<string, unknown>): NormalizedToolCall[] {
	const choices = obj.choices;
	if (!Array.isArray(choices) || choices.length === 0) return [];
	const first: unknown = choices[0];
	if (typeof first !== 'object' || first === null) return [];
	const message = (first as { message?: unknown }).message;
	if (typeof message !== 'object' || message === null) return [];
	return normalizeToolCallList((message as { tool_calls?: unknown }).tool_calls);
}

function normalizeToolCallList(raw: unknown): NormalizedToolCall[] {
	if (!Array.isArray(raw)) return [];
	const out: NormalizedToolCall[] = [];
	for (const entry of raw) {
		if (typeof entry !== 'object' || entry === null) continue;
		const e = entry as Record<string, unknown>;
		const fn = (e.function ?? e) as Record<string, unknown>;
		const name = typeof fn.name === 'string' ? fn.name : undefined;
		if (!name) continue;
		const args = coerceArgumentsToString(fn.arguments);
		const id =
			typeof e.id === 'string' ? e.id : `call_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
		out.push({ id, name, arguments: args });
	}
	return out;
}

function coerceArgumentsToString(args: unknown): string {
	if (typeof args === 'string') return args;
	if (args === undefined || args === null) return '{}';
	// Object/array → JSON string. SDKs choke on non-string arguments.
	try {
		return JSON.stringify(args);
	} catch {
		return '{}';
	}
}

function extractAssistantContent(body: unknown): string {
	if (body === null || body === undefined) return '';
	if (typeof body === 'string') return body;
	// Express body-parser only produces JSON-compatible values, so the only
	// remaining non-object primitives here are number / boolean / bigint.
	if (typeof body !== 'object') return String(body as number | boolean | bigint);

	const obj = body as Record<string, unknown>;

	// chat.completion shape — pull the first assistant message's content.
	const choices = obj.choices;
	if (Array.isArray(choices) && choices.length > 0) {
		const first: unknown = choices[0];
		if (typeof first === 'object' && first !== null) {
			const message = (first as { message?: unknown }).message;
			if (typeof message === 'object' && message !== null) {
				const inner = (message as { content?: unknown }).content;
				if (typeof inner === 'string') return inner;
			}
		}
	}

	// `{ content: "..." }` and `{ message: "..." }` shorthands the LLM sometimes emits.
	if (typeof obj.content === 'string') return obj.content;
	if (typeof obj.message === 'string') return obj.message;

	// Silently emitting an empty assistant turn would mask mock-handler bugs.
	return JSON.stringify(body);
}

function extractFinishReason(body: unknown): string {
	if (typeof body !== 'object' || body === null) return 'stop';
	const choices = (body as { choices?: unknown }).choices;
	if (Array.isArray(choices) && choices.length > 0) {
		const first: unknown = choices[0];
		if (typeof first === 'object' && first !== null) {
			const reason = (first as { finish_reason?: unknown }).finish_reason;
			if (typeof reason === 'string' && reason.length > 0) return reason;
		}
	}
	return 'stop';
}
