import type { EvalMockHttpResponse } from 'n8n-core';

import {
	buildOpenAiErrorEnvelope,
	extractRequestModel,
	extractToolCalls,
	forwardTranslateToChatCompletion,
	forwardTranslateToSseChunks,
	isStreamRequested,
	reverseTranslateOpenAiRequest,
} from '../openai-envelope';

describe('reverseTranslateOpenAiRequest', () => {
	it('emits the synthetic OpenAI URL and POST method', () => {
		const result = reverseTranslateOpenAiRequest({ model: 'gpt-4o-mini', messages: [] });

		expect(result.url).toBe('https://api.openai.com/v1/chat/completions');
		expect(result.method).toBe('POST');
	});

	it('passes the inbound body through unchanged', () => {
		const body = {
			model: 'gpt-4o',
			messages: [{ role: 'user', content: 'hello' }],
			temperature: 0.7,
			tools: [{ type: 'function', function: { name: 'foo' } }],
		};

		const result = reverseTranslateOpenAiRequest(body);

		expect(result.body).toBe(body);
	});

	it('substitutes an empty object when body is undefined', () => {
		const result = reverseTranslateOpenAiRequest(undefined);

		expect(result.body).toEqual({});
	});

	it('substitutes an empty object when body is null', () => {
		const result = reverseTranslateOpenAiRequest(null);

		expect(result.body).toEqual({});
	});
});

describe('extractRequestModel', () => {
	it('returns the model string from a well-formed body', () => {
		expect(extractRequestModel({ model: 'gpt-5' })).toBe('gpt-5');
	});

	it('falls back to gpt-4o-mini when the body omits a model', () => {
		expect(extractRequestModel({ messages: [] })).toBe('gpt-4o-mini');
	});

	it('falls back to gpt-4o-mini for non-string model values', () => {
		expect(extractRequestModel({ model: 42 })).toBe('gpt-4o-mini');
		expect(extractRequestModel({ model: null })).toBe('gpt-4o-mini');
		expect(extractRequestModel({ model: '' })).toBe('gpt-4o-mini');
	});

	it('falls back for non-object inputs', () => {
		expect(extractRequestModel(undefined)).toBe('gpt-4o-mini');
		expect(extractRequestModel(null)).toBe('gpt-4o-mini');
		expect(extractRequestModel('gpt-4o')).toBe('gpt-4o-mini');
	});
});

describe('isStreamRequested', () => {
	it('returns true only when stream === true', () => {
		expect(isStreamRequested({ stream: true })).toBe(true);
	});

	it('returns false for missing, false, or truthy-non-true values', () => {
		expect(isStreamRequested({})).toBe(false);
		expect(isStreamRequested({ stream: false })).toBe(false);
		expect(isStreamRequested({ stream: 1 })).toBe(false);
		expect(isStreamRequested({ stream: 'true' })).toBe(false);
		expect(isStreamRequested(undefined)).toBe(false);
		expect(isStreamRequested(null)).toBe(false);
	});
});

describe('extractToolCalls', () => {
	it('returns an empty list when no tool calls are present', () => {
		expect(extractToolCalls(undefined)).toEqual([]);
		expect(extractToolCalls(null)).toEqual([]);
		expect(extractToolCalls({})).toEqual([]);
		expect(extractToolCalls({ content: 'just text' })).toEqual([]);
	});

	it('normalizes the OpenAI-native tool_calls shape', () => {
		const result = extractToolCalls({
			tool_calls: [
				{ id: 'call_1', function: { name: 'get_weather', arguments: '{"city":"Paris"}' } },
			],
		});

		expect(result).toEqual([{ id: 'call_1', name: 'get_weather', arguments: '{"city":"Paris"}' }]);
	});

	it('generates a synthetic id when none is provided', () => {
		const result = extractToolCalls({
			tool_calls: [{ function: { name: 'foo', arguments: '{}' } }],
		});

		expect(result).toHaveLength(1);
		expect(result[0].id).toMatch(/^call_[a-f0-9]+$/);
		expect(result[0].name).toBe('foo');
	});

	it('coerces object arguments to JSON strings (SDKs require strings)', () => {
		const result = extractToolCalls({
			tool_calls: [{ function: { name: 'foo', arguments: { city: 'Paris' } } }],
		});

		expect(result[0].arguments).toBe('{"city":"Paris"}');
	});

	it('defaults arguments to "{}" when missing or null', () => {
		const result = extractToolCalls({
			tool_calls: [{ function: { name: 'foo' } }, { function: { name: 'bar', arguments: null } }],
		});

		expect(result[0].arguments).toBe('{}');
		expect(result[1].arguments).toBe('{}');
	});

	it('accepts the `{ name, arguments }` shorthand', () => {
		const result = extractToolCalls({
			tool_calls: [{ name: 'shorthand', arguments: '{"a":1}' }],
		});

		expect(result).toEqual([expect.objectContaining({ name: 'shorthand', arguments: '{"a":1}' })]);
	});

	it('unwraps tool calls nested under a choices envelope', () => {
		const result = extractToolCalls({
			choices: [
				{
					message: {
						tool_calls: [{ id: 'call_2', function: { name: 'lookup', arguments: '{}' } }],
					},
				},
			],
		});

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('lookup');
	});

	it('extracts a single-tool shorthand under `tool`', () => {
		const result = extractToolCalls({
			tool: { name: 'single', arguments: '{"x":1}' },
		});

		expect(result).toEqual([expect.objectContaining({ name: 'single', arguments: '{"x":1}' })]);
	});

	it('handles multiple tool calls', () => {
		const result = extractToolCalls({
			tool_calls: [
				{ id: 'a', function: { name: 'one', arguments: '{}' } },
				{ id: 'b', function: { name: 'two', arguments: '{}' } },
			],
		});

		expect(result.map((t) => t.name)).toEqual(['one', 'two']);
		expect(result.map((t) => t.id)).toEqual(['a', 'b']);
	});

	it('skips entries without a function name', () => {
		const result = extractToolCalls({
			tool_calls: [
				{ id: 'a', function: { arguments: '{}' } },
				{ id: 'b', function: { name: 'kept', arguments: '{}' } },
			],
		});

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('kept');
	});
});

describe('forwardTranslateToChatCompletion', () => {
	function mockResponse(body: unknown): EvalMockHttpResponse {
		return {
			body,
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		};
	}

	it('produces a chat.completion envelope with all required fields', () => {
		const envelope = forwardTranslateToChatCompletion(
			mockResponse({ content: 'hello there' }),
			'gpt-4o',
		);

		expect(envelope).toMatchObject({
			object: 'chat.completion',
			model: 'gpt-4o',
			choices: [
				{
					index: 0,
					message: { role: 'assistant', content: 'hello there' },
					finish_reason: 'stop',
				},
			],
			usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
		});
		expect(typeof envelope.id).toBe('string');
		expect((envelope.id as string).startsWith('chatcmpl-')).toBe(true);
		expect(typeof envelope.created).toBe('number');
	});

	it('extracts content from an already-shaped chat.completion body', () => {
		const inner = {
			id: 'foo',
			object: 'chat.completion',
			model: 'gpt-4',
			choices: [
				{
					index: 0,
					message: { role: 'assistant', content: 'unwrap me' },
					finish_reason: 'length',
				},
			],
		};

		const envelope = forwardTranslateToChatCompletion(mockResponse(inner), 'gpt-4o');

		const choice = (
			envelope.choices as Array<{ message: { content: string }; finish_reason: string }>
		)[0];
		expect(choice.message.content).toBe('unwrap me');
		expect(choice.finish_reason).toBe('length');
	});

	it('extracts content from a `{ content: "..." }` shorthand', () => {
		const envelope = forwardTranslateToChatCompletion(
			mockResponse({ content: 'a reply' }),
			'gpt-4o',
		);

		const choice = (envelope.choices as Array<{ message: { content: string } }>)[0];
		expect(choice.message.content).toBe('a reply');
	});

	it('extracts content from a `{ message: "..." }` shorthand', () => {
		const envelope = forwardTranslateToChatCompletion(
			mockResponse({ message: 'another reply' }),
			'gpt-4o',
		);

		const choice = (envelope.choices as Array<{ message: { content: string } }>)[0];
		expect(choice.message.content).toBe('another reply');
	});

	it('uses a raw string body as the assistant content', () => {
		const envelope = forwardTranslateToChatCompletion(mockResponse('plain string'), 'gpt-4o');

		const choice = (envelope.choices as Array<{ message: { content: string } }>)[0];
		expect(choice.message.content).toBe('plain string');
	});

	it('falls back to stringifying unknown shapes so content is never empty', () => {
		const envelope = forwardTranslateToChatCompletion(
			mockResponse({ unexpected: { nested: 'value' } }),
			'gpt-4o',
		);

		const choice = (envelope.choices as Array<{ message: { content: string } }>)[0];
		expect(choice.message.content).toBe(JSON.stringify({ unexpected: { nested: 'value' } }));
	});

	it('emits an empty assistant content for an undefined/null body', () => {
		const envelopeUndef = forwardTranslateToChatCompletion(mockResponse(undefined), 'gpt-4o');
		const envelopeNull = forwardTranslateToChatCompletion(mockResponse(null), 'gpt-4o');

		const choiceA = (envelopeUndef.choices as Array<{ message: { content: string } }>)[0];
		const choiceB = (envelopeNull.choices as Array<{ message: { content: string } }>)[0];
		expect(choiceA.message.content).toBe('');
		expect(choiceB.message.content).toBe('');
	});

	it('handles a missing mock response (undefined)', () => {
		const envelope = forwardTranslateToChatCompletion(undefined, 'gpt-4o');

		const choice = (
			envelope.choices as Array<{ message: { content: string }; finish_reason: string }>
		)[0];
		expect(choice.message.content).toBe('');
		expect(choice.finish_reason).toBe('stop');
	});

	it('uses provided model verbatim', () => {
		const envelope = forwardTranslateToChatCompletion(mockResponse({ content: 'x' }), 'gpt-5');

		expect(envelope.model).toBe('gpt-5');
	});

	it('emits tool_calls on the assistant message when the body contains them', () => {
		const envelope = forwardTranslateToChatCompletion(
			mockResponse({
				tool_calls: [
					{ id: 'call_1', function: { name: 'get_weather', arguments: '{"city":"Paris"}' } },
				],
			}),
			'gpt-4o',
		);

		const choice = (
			envelope.choices as Array<{
				message: {
					role: string;
					content: string | null;
					tool_calls?: Array<{
						id: string;
						type: string;
						function: { name: string; arguments: string };
					}>;
				};
				finish_reason: string;
			}>
		)[0];
		expect(choice.message.role).toBe('assistant');
		// Tool-call envelopes require content === null — SDKs reject content + tool_calls.
		expect(choice.message.content).toBeNull();
		expect(choice.message.tool_calls).toEqual([
			{
				id: 'call_1',
				type: 'function',
				function: { name: 'get_weather', arguments: '{"city":"Paris"}' },
			},
		]);
		expect(choice.finish_reason).toBe('tool_calls');
	});

	it('emits multiple tool_calls when several are present', () => {
		const envelope = forwardTranslateToChatCompletion(
			mockResponse({
				tool_calls: [
					{ id: 'a', function: { name: 'one', arguments: '{}' } },
					{ id: 'b', function: { name: 'two', arguments: '{}' } },
				],
			}),
			'gpt-4o',
		);

		const choice = (
			envelope.choices as Array<{
				message: { tool_calls?: Array<{ id: string }> };
				finish_reason: string;
			}>
		)[0];
		expect(choice.message.tool_calls).toHaveLength(2);
		expect(choice.finish_reason).toBe('tool_calls');
	});
});

describe('forwardTranslateToSseChunks', () => {
	function mockResponse(body: unknown): EvalMockHttpResponse {
		return {
			body,
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		};
	}

	it('emits an opening role chunk, a content chunk, and a finish_reason chunk', () => {
		const chunks = forwardTranslateToSseChunks(mockResponse({ content: 'hello' }), 'gpt-4o');

		expect(chunks.length).toBeGreaterThanOrEqual(3);
		const firstDelta = (chunks[0].choices as Array<{ delta: { role?: string } }>)[0].delta;
		expect(firstDelta.role).toBe('assistant');

		const contentChunk = chunks.find(
			(c) => (c.choices as Array<{ delta: { content?: string } }>)[0].delta.content === 'hello',
		);
		expect(contentChunk).toBeDefined();

		const terminal = chunks[chunks.length - 1];
		const terminalChoice = (terminal.choices as Array<{ finish_reason: string }>)[0];
		expect(terminalChoice.finish_reason).toBe('stop');
	});

	it('every chunk carries the canonical object discriminator', () => {
		const chunks = forwardTranslateToSseChunks(mockResponse({ content: 'hi' }), 'gpt-4o');

		for (const chunk of chunks) {
			expect(chunk.object).toBe('chat.completion.chunk');
		}
	});

	it('every chunk shares the same id and created timestamp', () => {
		const chunks = forwardTranslateToSseChunks(mockResponse({ content: 'hi' }), 'gpt-4o');

		const ids = new Set(chunks.map((c) => c.id));
		const createdSet = new Set(chunks.map((c) => c.created));
		expect(ids.size).toBe(1);
		expect(createdSet.size).toBe(1);
	});

	it('emits tool_calls with first-chunk id+name then arg-stream chunks then a tool_calls terminal', () => {
		const chunks = forwardTranslateToSseChunks(
			mockResponse({
				tool_calls: [
					{
						id: 'call_xyz',
						function: { name: 'get_weather', arguments: '{"city":"Paris"}' },
					},
				],
			}),
			'gpt-4o',
		);

		// Opening role chunk + first-chunk (id+name) + args-chunk + terminal = 4.
		expect(chunks).toHaveLength(4);

		const opener = (chunks[0].choices as Array<{ delta: Record<string, unknown> }>)[0].delta;
		expect(opener.role).toBe('assistant');
		// SDK reducers expect content: null when the turn will emit tool_calls.
		expect(opener.content).toBeNull();

		const firstToolChunk = (
			chunks[1].choices as Array<{
				delta: {
					tool_calls?: Array<{
						index: number;
						id?: string;
						type?: string;
						function?: { name?: string; arguments?: string };
					}>;
				};
			}>
		)[0].delta;
		expect(firstToolChunk.tool_calls?.[0]).toMatchObject({
			index: 0,
			id: 'call_xyz',
			type: 'function',
			function: { name: 'get_weather', arguments: '' },
		});

		const argsChunk = (
			chunks[2].choices as Array<{
				delta: {
					tool_calls?: Array<{ index: number; function?: { arguments?: string } }>;
				};
			}>
		)[0].delta;
		// Arg-stream chunk MUST set `index` (SDKs use it to identify the slot)
		// but MUST NOT repeat `id` or `function.name` (only the first chunk owns those).
		expect(argsChunk.tool_calls?.[0].index).toBe(0);
		expect(argsChunk.tool_calls?.[0].function?.arguments).toBe('{"city":"Paris"}');
		const argEntry = argsChunk.tool_calls?.[0] as {
			index: number;
			id?: string;
			function?: { name?: string; arguments?: string };
		};
		expect(argEntry.id).toBeUndefined();
		expect(argEntry.function?.name).toBeUndefined();

		const terminal = chunks[3];
		expect((terminal.choices as Array<{ finish_reason: string }>)[0].finish_reason).toBe(
			'tool_calls',
		);
	});

	it('emits the empty-arguments tool call without an arg-stream chunk', () => {
		const chunks = forwardTranslateToSseChunks(
			mockResponse({
				tool_calls: [{ id: 'call_1', function: { name: 'noop', arguments: '' } }],
			}),
			'gpt-4o',
		);

		// opener + first-chunk(id+name) + terminal = 3 — no args slice.
		expect(chunks).toHaveLength(3);
		const firstToolChunk = (chunks[1].choices as Array<{ delta: { tool_calls?: unknown[] } }>)[0]
			.delta;
		expect(firstToolChunk.tool_calls).toBeDefined();
		expect((chunks[2].choices as Array<{ finish_reason: string }>)[0].finish_reason).toBe(
			'tool_calls',
		);
	});

	it('emits two first-chunks (one per tool) for multi-tool responses', () => {
		const chunks = forwardTranslateToSseChunks(
			mockResponse({
				tool_calls: [
					{ id: 'a', function: { name: 'one', arguments: '{"a":1}' } },
					{ id: 'b', function: { name: 'two', arguments: '{"b":2}' } },
				],
			}),
			'gpt-4o',
		);

		const firstChunks = chunks
			.flatMap(
				(c) =>
					(c.choices as Array<{ delta: { tool_calls?: Array<{ id?: string }> } }>)[0].delta
						.tool_calls ?? [],
			)
			.filter((tc) => typeof tc.id === 'string');
		expect(firstChunks.map((tc) => tc.id)).toEqual(['a', 'b']);

		const terminal = chunks[chunks.length - 1];
		expect((terminal.choices as Array<{ finish_reason: string }>)[0].finish_reason).toBe(
			'tool_calls',
		);
	});

	it('streams empty content as the terminal finish_reason chunk only (no content chunk)', () => {
		const chunks = forwardTranslateToSseChunks(mockResponse({ content: '' }), 'gpt-4o');

		// opener + terminal = 2.
		expect(chunks).toHaveLength(2);
		const terminal = chunks[chunks.length - 1];
		expect((terminal.choices as Array<{ finish_reason: string }>)[0].finish_reason).toBe('stop');
	});

	it('uses the provided model verbatim across all chunks', () => {
		const chunks = forwardTranslateToSseChunks(mockResponse({ content: 'hi' }), 'gpt-5');
		expect(chunks.every((c) => c.model === 'gpt-5')).toBe(true);
	});
});

describe('buildOpenAiErrorEnvelope', () => {
	it('produces the standard OpenAI error shape with the supplied message', () => {
		const envelope = buildOpenAiErrorEnvelope('mock failed: rate-limited');

		expect(envelope).toEqual({
			error: {
				message: 'mock failed: rate-limited',
				type: 'eval_wire_server_error',
				param: null,
				code: 'eval_mock_generation_failed',
			},
		});
	});
});
