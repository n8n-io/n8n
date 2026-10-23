import { createUsageReader, parseProviderUsage } from '../provider-usage';

const sse = (...events: object[]) =>
	events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n';

const readInChunks = (body: string, size: number) => {
	const reader = createUsageReader();
	const bytes = Buffer.from(body, 'utf8');
	for (let i = 0; i < bytes.length; i += size) reader.push(bytes.subarray(i, i + size));
	return reader.result();
};

describe('parseProviderUsage', () => {
	it('reads an OpenAI chat completion', () => {
		expect(
			parseProviderUsage({
				id: 'chatcmpl-1',
				model: 'gpt-4o-mini',
				usage: {
					prompt_tokens: 11,
					completion_tokens: 7,
					prompt_tokens_details: { cached_tokens: 3 },
				},
			}),
		).toEqual({
			provider: 'openai',
			model: 'gpt-4o-mini',
			providerResponseId: 'chatcmpl-1',
			inputTokens: 11,
			outputTokens: 7,
			cacheReadTokens: 3,
			cacheWriteTokens: 0,
		});
	});

	it('reads an OpenAI Responses result', () => {
		expect(
			parseProviderUsage({
				id: 'resp_1',
				object: 'response',
				model: 'gpt-x',
				usage: { input_tokens: 20, output_tokens: 5, input_tokens_details: { cached_tokens: 4 } },
			}),
		).toMatchObject({
			providerResponseId: 'resp_1',
			inputTokens: 20,
			outputTokens: 5,
			cacheReadTokens: 4,
		});
	});

	it('reads an Anthropic message, with cache tokens counted as input', () => {
		expect(
			parseProviderUsage({
				id: 'msg_1',
				type: 'message',
				model: 'claude-x',
				usage: {
					input_tokens: 10,
					output_tokens: 7,
					cache_read_input_tokens: 100,
					cache_creation_input_tokens: 20,
				},
			}),
		).toMatchObject({
			provider: 'anthropic',
			inputTokens: 130,
			outputTokens: 7,
			cacheReadTokens: 100,
			cacheWriteTokens: 20,
		});
	});

	it('reads a Gemini response, with thinking tokens counted as output', () => {
		expect(
			parseProviderUsage({
				responseId: 'gem-1',
				modelVersion: 'gemini-x',
				usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 7, thoughtsTokenCount: 3 },
			}),
		).toMatchObject({
			provider: 'google',
			providerResponseId: 'gem-1',
			inputTokens: 11,
			outputTokens: 10,
		});
	});

	it('counts missing output tokens as 0, for example for embeddings', () => {
		expect(
			parseProviderUsage({ model: 'text-embedding-3-small', usage: { prompt_tokens: 8 } }),
		).toMatchObject({ inputTokens: 8, outputTokens: 0 });
	});

	it('returns undefined for a response without a known usage block', () => {
		expect(parseProviderUsage({ model: 'x', result: 'ok' })).toBeUndefined();
		expect(parseProviderUsage('not json')).toBeUndefined();
	});

	it('reads a JSON body given as a Buffer, and a Gemini JSON array stream', () => {
		const body = Buffer.from(
			JSON.stringify({ id: 'c', usage: { prompt_tokens: 1, completion_tokens: 2 } }),
		);
		expect(parseProviderUsage(body)).toMatchObject({ inputTokens: 1, outputTokens: 2 });
		expect(
			parseProviderUsage(
				JSON.stringify([
					{ usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1 } },
					{ usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 4 } },
				]),
			),
		).toMatchObject({ inputTokens: 5, outputTokens: 4 });
	});
});

describe('createUsageReader', () => {
	it('reads OpenAI chat SSE from the final usage chunk', () => {
		const body = sse(
			{ id: 'chatcmpl-1', model: 'gpt-x', choices: [{ delta: { content: 'Hi' } }], usage: null },
			{
				id: 'chatcmpl-1',
				model: 'gpt-x',
				choices: [],
				usage: { prompt_tokens: 11, completion_tokens: 7 },
			},
		);
		expect(readInChunks(body, 1000)).toMatchObject({
			providerResponseId: 'chatcmpl-1',
			outputTokens: 7,
		});
	});

	it('reads OpenAI Responses SSE from the completed event', () => {
		const body = sse(
			{ type: 'response.created', response: { id: 'resp_1', object: 'response', usage: null } },
			{
				type: 'response.completed',
				response: {
					id: 'resp_1',
					object: 'response',
					usage: { input_tokens: 3, output_tokens: 2 },
				},
			},
		);
		expect(readInChunks(body, 1000)).toMatchObject({
			providerResponseId: 'resp_1',
			inputTokens: 3,
		});
	});

	it('reads Anthropic SSE, taking the last output count as the total', () => {
		const body = sse(
			{
				type: 'message_start',
				message: { id: 'msg_1', model: 'claude-x', usage: { input_tokens: 11, output_tokens: 1 } },
			},
			{ type: 'content_block_delta', delta: { text: 'Hi' } },
			{ type: 'message_delta', usage: { output_tokens: 7 } },
		);
		expect(readInChunks(body, 1000)).toMatchObject({
			provider: 'anthropic',
			providerResponseId: 'msg_1',
			inputTokens: 11,
			outputTokens: 7,
		});
	});

	it('reads Anthropic SSE when a running total also raises input and cache counts', () => {
		const body = sse(
			{
				type: 'message_start',
				message: { id: 'msg_1', model: 'claude-x', usage: { input_tokens: 11, output_tokens: 1 } },
			},
			{
				type: 'message_delta',
				usage: { input_tokens: 40, cache_read_input_tokens: 5, output_tokens: 9 },
			},
		);
		expect(readInChunks(body, 1000)).toMatchObject({
			inputTokens: 45,
			cacheReadTokens: 5,
			outputTokens: 9,
		});
	});

	it('reads the billed usage of an OpenAI Responses stream that ends incomplete', () => {
		const body = sse(
			{ type: 'response.created', response: { id: 'resp_1', object: 'response', usage: null } },
			{
				type: 'response.incomplete',
				response: {
					id: 'resp_1',
					object: 'response',
					model: 'o4-mini',
					usage: { input_tokens: 20, output_tokens: 4096 },
				},
			},
		);
		expect(readInChunks(body, 1000)).toMatchObject({ inputTokens: 20, outputTokens: 4096 });
	});

	it('skips one SSE line over 1 MB and still reads the usage after it', () => {
		const image = `data: ${JSON.stringify({ image: 'x'.repeat(1_100_000) })}\n\n`;
		const body =
			image + sse({ id: 'c', choices: [], usage: { prompt_tokens: 3, completion_tokens: 2 } });
		expect(readInChunks(body, 64_000)).toMatchObject({ inputTokens: 3, outputTokens: 2 });
	});

	it('reads Gemini SSE from the last frame with usage', () => {
		const body = sse(
			{ responseId: 'g', usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1 } },
			{ responseId: 'g', usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 9 } },
		);
		expect(readInChunks(body, 1000)).toMatchObject({ outputTokens: 9 });
	});

	it('gives the same result when chunks split lines and multi-byte characters', () => {
		const body = sse(
			{ id: 'chatcmpl-1', choices: [{ delta: { content: 'Grüße 👋' } }] },
			{ id: 'chatcmpl-1', choices: [], usage: { prompt_tokens: 11, completion_tokens: 7 } },
		);
		expect(readInChunks(body, 3)).toEqual(readInChunks(body, 100_000));
		expect(readInChunks(body, 3)).toMatchObject({ outputTokens: 7 });
	});

	it('stops at once on a body that is neither JSON nor SSE, such as audio', () => {
		const reader = createUsageReader();
		reader.push(Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x0f, 0x00, 0x00]));

		expect(reader.isDone()).toBe(true);
		expect(parseProviderUsage(Buffer.alloc(20_000_000, 0xff))).toBeUndefined();
	});

	it('gives up on a JSON body over 1 MB', () => {
		const body = JSON.stringify({ usage: { prompt_tokens: 1 }, padding: 'x'.repeat(1_100_000) });
		expect(readInChunks(body, 64_000)).toBeUndefined();
	});
});
