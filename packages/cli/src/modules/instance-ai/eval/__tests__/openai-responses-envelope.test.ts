import type { EvalMockHttpResponse } from 'n8n-core';

import {
	buildResponsesErrorEnvelope,
	extractResponsesRequestModel,
	forwardTranslateToResponsesEnvelope,
	forwardTranslateToResponsesSseEvents,
	isResponsesStreamRequested,
	reverseTranslateOpenAiResponsesRequest,
} from '../openai-responses-envelope';

describe('reverseTranslateOpenAiResponsesRequest', () => {
	it('emits the synthetic /v1/responses URL and POST method', () => {
		const result = reverseTranslateOpenAiResponsesRequest({ model: 'gpt-4o-mini', input: [] });

		expect(result.url).toBe('https://api.openai.com/v1/responses');
		expect(result.method).toBe('POST');
	});

	it('passes the inbound body through unchanged', () => {
		const body = {
			model: 'gpt-4o',
			input: [{ role: 'user', content: 'hi' }],
			tools: [{ type: 'function', name: 'foo' }],
			stream: true,
		};

		const result = reverseTranslateOpenAiResponsesRequest(body);

		expect(result.body).toBe(body);
	});

	it('substitutes an empty object when body is null or undefined', () => {
		expect(reverseTranslateOpenAiResponsesRequest(undefined).body).toEqual({});
		expect(reverseTranslateOpenAiResponsesRequest(null).body).toEqual({});
	});
});

describe('extractResponsesRequestModel', () => {
	it('returns the model string from a well-formed body', () => {
		expect(extractResponsesRequestModel({ model: 'gpt-5' })).toBe('gpt-5');
	});

	it('falls back to gpt-4o-mini for missing, empty, or non-string values', () => {
		expect(extractResponsesRequestModel({})).toBe('gpt-4o-mini');
		expect(extractResponsesRequestModel({ model: '' })).toBe('gpt-4o-mini');
		expect(extractResponsesRequestModel({ model: 42 })).toBe('gpt-4o-mini');
		expect(extractResponsesRequestModel(undefined)).toBe('gpt-4o-mini');
		expect(extractResponsesRequestModel(null)).toBe('gpt-4o-mini');
	});
});

describe('isResponsesStreamRequested', () => {
	it('returns true only when stream === true', () => {
		expect(isResponsesStreamRequested({ stream: true })).toBe(true);
	});

	it('returns false for missing, false, or truthy-non-true values', () => {
		expect(isResponsesStreamRequested({})).toBe(false);
		expect(isResponsesStreamRequested({ stream: false })).toBe(false);
		expect(isResponsesStreamRequested({ stream: 1 })).toBe(false);
		expect(isResponsesStreamRequested({ stream: 'true' })).toBe(false);
		expect(isResponsesStreamRequested(undefined)).toBe(false);
		expect(isResponsesStreamRequested(null)).toBe(false);
	});
});

describe('forwardTranslateToResponsesEnvelope', () => {
	function mockResponse(body: unknown): EvalMockHttpResponse {
		return {
			body,
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		};
	}

	it('produces a `response` envelope with all required top-level fields', () => {
		const envelope = forwardTranslateToResponsesEnvelope(
			mockResponse({ output_text: 'hello there' }),
			'gpt-4o',
		);

		expect(envelope).toMatchObject({
			object: 'response',
			status: 'completed',
			model: 'gpt-4o',
			usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
		});
		expect(typeof envelope.id).toBe('string');
		expect((envelope.id as string).startsWith('resp_')).toBe(true);
		expect(typeof envelope.created_at).toBe('number');
	});

	it('emits a single assistant message with `annotations: []` on output_text', () => {
		const envelope = forwardTranslateToResponsesEnvelope(
			mockResponse({ output_text: 'a reply' }),
			'gpt-4o',
		);

		const output = envelope.output as Array<{
			type: string;
			role: string;
			content: Array<{ type: string; text: string; annotations: unknown[] }>;
		}>;
		expect(output).toHaveLength(1);
		expect(output[0].type).toBe('message');
		expect(output[0].role).toBe('assistant');
		expect(output[0].content[0].type).toBe('output_text');
		expect(output[0].content[0].text).toBe('a reply');
		// `annotations: []` is required by the OpenAI SDK — LangChain's
		// extractor calls `.annotations.map(...)` and crashes on undefined.
		expect(output[0].content[0].annotations).toEqual([]);
	});

	it('extracts content from `output_text`, `content`, and `message` shorthand bodies', () => {
		const cases: Array<[unknown, string]> = [
			[{ output_text: 'first' }, 'first'],
			[{ content: 'second' }, 'second'],
			[{ message: 'third' }, 'third'],
		];

		for (const [body, expected] of cases) {
			const env = forwardTranslateToResponsesEnvelope(mockResponse(body), 'gpt-4o');
			const output = env.output as Array<{
				content: Array<{ text: string }>;
			}>;
			expect(output[0].content[0].text).toBe(expected);
		}
	});

	it('extracts content from an already-shaped responses envelope', () => {
		const inner = {
			id: 'resp_inner',
			object: 'response',
			output: [
				{
					id: 'msg_inner',
					type: 'message',
					role: 'assistant',
					content: [{ type: 'output_text', text: 'unwrap me', annotations: [] }],
					status: 'completed',
				},
			],
		};
		const env = forwardTranslateToResponsesEnvelope(mockResponse(inner), 'gpt-4o');
		const output = env.output as Array<{ content: Array<{ text: string }> }>;
		expect(output[0].content[0].text).toBe('unwrap me');
	});

	it('replaces the message with a function_call item when the body has tool_calls', () => {
		const envelope = forwardTranslateToResponsesEnvelope(
			mockResponse({
				tool_calls: [
					{ id: 'call_1', function: { name: 'lookup_order', arguments: '{"id":"42"}' } },
				],
			}),
			'gpt-4o',
		);

		const output = envelope.output as Array<Record<string, unknown>>;
		expect(output).toHaveLength(1);
		expect(output[0].type).toBe('function_call');
		expect(output[0].name).toBe('lookup_order');
		expect(output[0].call_id).toBe('call_1');
		expect(output[0].arguments).toBe('{"id":"42"}');
		// No message item alongside the tool call — Responses API mode is exclusive.
		expect(output.find((item) => item.type === 'message')).toBeUndefined();
	});

	it('emits multiple function_call items when several tool_calls are present', () => {
		const envelope = forwardTranslateToResponsesEnvelope(
			mockResponse({
				tool_calls: [
					{ id: 'a', function: { name: 'one', arguments: '{}' } },
					{ id: 'b', function: { name: 'two', arguments: '{}' } },
				],
			}),
			'gpt-4o',
		);
		const output = envelope.output as Array<{ type: string; name: string }>;
		expect(output.map((o) => o.type)).toEqual(['function_call', 'function_call']);
		expect(output.map((o) => o.name)).toEqual(['one', 'two']);
	});
});

describe('forwardTranslateToResponsesSseEvents', () => {
	function mockResponse(body: unknown): EvalMockHttpResponse {
		return {
			body,
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		};
	}

	it('emits the canonical event sequence for a plain text response', () => {
		const events = forwardTranslateToResponsesSseEvents(
			mockResponse({ output_text: 'hello' }),
			'gpt-4o',
		);

		const eventNames = events.map((e) => e.event);
		expect(eventNames).toEqual([
			'response.created',
			'response.in_progress',
			'response.output_item.added',
			'response.content_part.added',
			'response.output_text.delta',
			'response.output_text.done',
			'response.content_part.done',
			'response.output_item.done',
			'response.completed',
		]);
	});

	it('skips the output_text.delta event when content is empty', () => {
		const events = forwardTranslateToResponsesSseEvents(
			mockResponse({ output_text: '' }),
			'gpt-4o',
		);
		const eventNames = events.map((e) => e.event);
		expect(eventNames).not.toContain('response.output_text.delta');
		expect(eventNames[eventNames.length - 1]).toBe('response.completed');
	});

	it('every event carries `annotations: []` on output_text parts', () => {
		const events = forwardTranslateToResponsesSseEvents(
			mockResponse({ output_text: 'hi' }),
			'gpt-4o',
		);

		const partEvents = events.filter(
			(e) => e.event === 'response.content_part.added' || e.event === 'response.content_part.done',
		);
		for (const e of partEvents) {
			const part = (e.data as { part?: { annotations?: unknown } }).part;
			expect(part?.annotations).toEqual([]);
		}
	});

	it('terminal message item (`output_item.done`, `response.completed`) carries `annotations: []`', () => {
		// Regression: earlier the terminal `messageItem` set `content:
		// [{ type: 'output_text', text }]` without `annotations: []`. SDK
		// consumers iterating the completed response would crash on
		// `.annotations.map(...)` exactly like the non-streaming bug we
		// already fixed.
		const events = forwardTranslateToResponsesSseEvents(
			mockResponse({ output_text: 'hello' }),
			'gpt-4o',
		);

		type MsgItem = { content?: Array<{ type?: string; annotations?: unknown }> };
		const findItem = (eventName: string): MsgItem | undefined => {
			const e = events.find((ev) => ev.event === eventName);
			if (eventName === 'response.completed') {
				return ((e?.data as { response?: { output?: MsgItem[] } }).response?.output ?? [])[0];
			}
			return (e?.data as { item?: MsgItem }).item;
		};

		for (const name of [
			'response.output_item.added',
			'response.output_item.done',
			'response.completed',
		]) {
			const item = findItem(name);
			expect(item?.content?.[0].type).toBe('output_text');
			expect(item?.content?.[0].annotations).toEqual([]);
		}
	});

	it('keeps `id` stable across output_item / arguments / completed events for the same tool call', () => {
		// Regression: earlier the SSE path generated the tool-call `id` once
		// for `output_item.added/done` and then re-ran the synthesizer for
		// `response.completed.output[]`, producing two different `fc_<uuid>`
		// values for the same `output_index`. SDK consumers that reconcile
		// state by `id` (e.g. tracing UIs) would fail to match.
		const events = forwardTranslateToResponsesSseEvents(
			mockResponse({
				tool_calls: [
					{ id: 'call_x', function: { name: 'fn', arguments: '{}' } },
					{ id: 'call_y', function: { name: 'fn2', arguments: '{}' } },
				],
			}),
			'gpt-4o',
		);

		const addedItems = events.filter((e) => e.event === 'response.output_item.added');
		const doneItems = events.filter((e) => e.event === 'response.output_item.done');
		const completed = events.find((e) => e.event === 'response.completed');
		const completedOutput = (completed?.data as { response?: { output?: Array<{ id?: string }> } })
			.response?.output;

		for (let i = 0; i < addedItems.length; i++) {
			const addedId = (addedItems[i].data as { item?: { id?: string } }).item?.id;
			const doneId = (doneItems[i].data as { item?: { id?: string } }).item?.id;
			const completedId = completedOutput?.[i].id;
			expect(addedId).toBe(doneId);
			expect(addedId).toBe(completedId);
			expect(typeof addedId).toBe('string');
		}
	});

	it('emits function_call event sequence with delta + done arguments for tool calls', () => {
		const events = forwardTranslateToResponsesSseEvents(
			mockResponse({
				tool_calls: [{ id: 'call_xyz', function: { name: 'lookup', arguments: '{"q":"hi"}' } }],
			}),
			'gpt-4o',
		);

		const eventNames = events.map((e) => e.event);
		expect(eventNames).toContain('response.output_item.added');
		expect(eventNames).toContain('response.function_call_arguments.delta');
		expect(eventNames).toContain('response.function_call_arguments.done');
		expect(eventNames).toContain('response.output_item.done');
		expect(eventNames[eventNames.length - 1]).toBe('response.completed');

		const deltaEvent = events.find((e) => e.event === 'response.function_call_arguments.delta');
		expect((deltaEvent?.data as { delta?: string })?.delta).toBe('{"q":"hi"}');

		const doneEvent = events.find((e) => e.event === 'response.function_call_arguments.done');
		expect((doneEvent?.data as { arguments?: string })?.arguments).toBe('{"q":"hi"}');
	});

	it('skips the function_call_arguments.delta event when arguments are empty', () => {
		const events = forwardTranslateToResponsesSseEvents(
			mockResponse({
				tool_calls: [{ id: 'call_1', function: { name: 'noop', arguments: '' } }],
			}),
			'gpt-4o',
		);

		const deltaEvent = events.find((e) => e.event === 'response.function_call_arguments.delta');
		expect(deltaEvent).toBeUndefined();
		expect(events.find((e) => e.event === 'response.function_call_arguments.done')).toBeDefined();
	});

	it('uses a single response id across the entire event sequence', () => {
		const events = forwardTranslateToResponsesSseEvents(
			mockResponse({ output_text: 'hi' }),
			'gpt-4o',
		);
		const ids = new Set<string>();
		for (const e of events) {
			const data = e.data as { response?: { id?: string } };
			if (data.response?.id) ids.add(data.response.id);
		}
		expect(ids.size).toBe(1);
		const id = Array.from(ids)[0];
		expect(id?.startsWith('resp_')).toBe(true);
	});
});

describe('buildResponsesErrorEnvelope', () => {
	it('produces the standard error shape with the supplied message', () => {
		const envelope = buildResponsesErrorEnvelope('mock failed: rate-limited');

		expect(envelope).toEqual({
			error: {
				message: 'mock failed: rate-limited',
				type: 'eval_wire_server_error',
				code: 'eval_mock_generation_failed',
				param: null,
			},
		});
	});
});
