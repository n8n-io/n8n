import type { EvalMockHttpResponse } from 'n8n-core';

import {
	buildOpenAiErrorEnvelope,
	extractRequestModel,
	forwardTranslateToChatCompletion,
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
