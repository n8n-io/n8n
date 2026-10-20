import { generateText, streamText } from 'ai';

import { Tool } from '../../../sdk/tool';
import type { StreamChunk, TokenUsage } from '../../../types';
import { AgentRuntime } from '../../loop/agent-runtime';
import { createModel } from '../model-factory';

const MODEL_ID = 'openrouter/anthropic/claude-sonnet-4.5';
const USAGE = {
	prompt_tokens: 1000,
	completion_tokens: 10,
	total_tokens: 1010,
	prompt_tokens_details: { cached_tokens: 200, cache_write_tokens: 300 },
};
const REASONING_DETAILS = [
	{
		type: 'reasoning.text',
		text: 'I will look up the records.',
		signature: 'reasoning-signature',
		format: 'anthropic-claude-v1',
		index: 0,
	},
	{
		type: 'reasoning.encrypted',
		data: 'opaque-reasoning',
		id: 'reasoning-1',
		format: 'anthropic-claude-v1',
		index: 1,
	},
];

function response(stream: boolean, withTools = false, usage: object = USAGE): Response {
	const base = { id: 'completion-1', model: 'anthropic/claude-sonnet-4.5', created: 1 };
	const message = withTools
		? {
				role: 'assistant',
				content: null,
				reasoning_details: REASONING_DETAILS,
				tool_calls: ['a', 'b', 'c', 'd'].map((id, index) => ({
					id,
					index,
					type: 'function',
					function: { name: 'lookup', arguments: '{}' },
				})),
			}
		: { role: 'assistant', content: 'Done.' };
	const finishReason = withTools ? 'tool_calls' : 'stop';
	if (!stream) {
		return Response.json({
			...base,
			provider: 'Anthropic',
			choices: [{ index: 0, message, finish_reason: finishReason }],
			usage,
		});
	}
	const chunks = [
		{ ...base, choices: [{ index: 0, delta: message, finish_reason: null }] },
		{ ...base, choices: [{ index: 0, delta: {}, finish_reason: finishReason }], usage },
	];
	return new Response(
		chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n',
		{ headers: { 'content-type': 'text/event-stream' } },
	);
}

describe.each(['generate', 'stream'] as const)('OpenRouter %s', (mode) => {
	it.each([
		{ ttl: '1h', cost: 0.00244 },
		{ ttl: '5m', cost: 0.00199 },
	] as const)(
		'caches the tool loop and prices each token once with $ttl',
		async ({ ttl, cost }) => {
			const fetch = vi.fn<typeof globalThis.fetch>();
			fetch.mockImplementation(async () =>
				response(mode === 'stream', fetch.mock.calls.length === 1),
			);
			const runtime = new AgentRuntime({
				name: 'test',
				model: { id: MODEL_ID, apiKey: 'test-key' },
				modelFetch: fetch,
				modelCost: { input: 1, output: 10, cacheRead: 0.1, cacheWrite: 1.25 },
				instructions: 'Look up the requested records.',
				promptCaching: { enabled: true, anthropic: { ttl } },
				reasoning: 'high',
				tools: [
					new Tool('lookup')
						.description('Look up a record')
						.input({ type: 'object', properties: {} })
						.handler(async () => ({ found: true }))
						.build(),
				],
			});
			let usage: TokenUsage | undefined;
			if (mode === 'generate') {
				const result = await runtime.generate('Look up four records.');
				expect(result.finishReason).toBe('stop');
				expect(result.messages).toContainEqual(
					expect.objectContaining({
						role: 'assistant',
						content: expect.arrayContaining([
							expect.objectContaining({ type: 'text', text: 'Done.' }),
						]),
					}),
				);
				usage = result.usage;
			} else {
				const result = await runtime.stream('Look up four records.');
				const chunks: StreamChunk[] = [];
				for await (const chunk of result.stream) chunks.push(chunk);
				expect(chunks.filter((chunk) => chunk.type === 'error')).toEqual([]);
				usage = chunks.filter((chunk) => chunk.type === 'finish').at(-1)?.usage;
				expect(chunks.some((chunk) => chunk.type === 'text-delta')).toBe(true);
			}
			expect(usage).toMatchObject({
				promptTokens: 2000,
				completionTokens: 20,
				inputTokenDetails: { noCache: 1000, cacheRead: 400, cacheWrite: 600 },
			});
			expect(usage?.cost).toBeCloseTo(cost, 8);
			expect(fetch).toHaveBeenCalledTimes(2);
			const requests = fetch.mock.calls.map(([, init]) => JSON.parse(init?.body as string));
			const cacheControl = { type: 'ephemeral', ttl };
			for (const request of requests) {
				expect(request).toMatchObject({
					cache_control: cacheControl,
					reasoning: { effort: 'high' },
					messages: expect.arrayContaining([
						expect.objectContaining({
							role: 'system',
							content: expect.arrayContaining([
								expect.objectContaining({ cache_control: cacheControl }),
							]),
						}),
					]),
				});
				expect(JSON.stringify(request).match(/"cache_control":/g)).toHaveLength(2);
			}
			expect(requests[1].messages).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ role: 'assistant', reasoning_details: REASONING_DETAILS }),
					...['a', 'b', 'c', 'd'].map((id) =>
						expect.objectContaining({ role: 'tool', tool_call_id: id }),
					),
				]),
			);
			expect(fetch.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/chat/completions');
		},
	);

	it.each([
		{ details: { cached_tokens: 200 }, noCache: 800, cacheWrite: undefined },
		{ details: { cached_tokens: 900, cache_write_tokens: 200 }, noCache: 0, cacheWrite: 200 },
	])(
		'handles incomplete or overlapping usage: $details',
		async ({ details, noCache, cacheWrite }) => {
			const fetch = vi
				.fn<typeof globalThis.fetch>()
				.mockResolvedValue(
					response(mode === 'stream', false, { ...USAGE, prompt_tokens_details: details }),
				);
			const model = createModel({ id: MODEL_ID, apiKey: 'test-key' }, fetch);
			const result =
				mode === 'generate'
					? await generateText({ model, prompt: 'Hello' })
					: streamText({ model, prompt: 'Hello' });
			expect((await result.usage).inputTokenDetails).toEqual({
				noCacheTokens: noCache,
				cacheReadTokens: details.cached_tokens,
				cacheWriteTokens: cacheWrite,
			});
		},
	);

	it('preserves raw usage and provider errors', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockResolvedValueOnce(response(mode === 'stream'));
		const model = createModel({ id: MODEL_ID, apiKey: 'test-key' }, fetch);
		if (mode === 'generate') {
			const result = await generateText({ model, prompt: 'Hello', maxRetries: 0 });
			expect(result.steps[0].usage.raw).toEqual(USAGE);
			expect(result.providerMetadata?.openrouter).toMatchObject({ provider: 'Anthropic' });
		} else {
			const result = streamText({ model, prompt: 'Hello', maxRetries: 0 });
			await result.consumeStream();
			expect((await result.steps)[0].usage.raw).toEqual(USAGE);
		}
		fetch.mockResolvedValueOnce(
			Response.json({ error: { message: 'Provider unavailable', code: 503 } }, { status: 503 }),
		);
		if (mode === 'generate') {
			await expect(generateText({ model, prompt: 'Hello', maxRetries: 0 })).rejects.toThrow(
				'Provider unavailable',
			);
		} else {
			const result = streamText({ model, prompt: 'Hello', maxRetries: 0 });
			const chunks = [];
			for await (const chunk of result.fullStream) chunks.push(chunk);
			expect(chunks).toContainEqual({
				type: 'error',
				error: expect.objectContaining({ message: 'Provider unavailable' }),
			});
		}
	});
});

describe('OpenRouter reasoning options', () => {
	it.each([
		'none',
		'minimal',
		'low',
		'medium',
		'high',
		'xhigh',
		'provider-default',
		undefined,
	] as const)('forwards %s through the adapter', async (reasoning) => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response(false));
		await generateText({
			model: createModel({ id: MODEL_ID, apiKey: 'test-key' }, fetch),
			prompt: 'Hello',
			reasoning,
		});
		const body = JSON.parse(fetch.mock.calls[0][1]?.body as string);
		const expected =
			reasoning && reasoning !== 'provider-default' ? { effort: reasoning } : undefined;
		expect(body.reasoning).toEqual(expected);
		expect(body.cache_control).toBeUndefined();
	});

	it('preserves an explicit reasoning budget and other caller options', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response(false));
		const providerOptions = {
			openrouter: { reasoning: { max_tokens: 4096, exclude: false }, user: 'test-user' },
		};
		await generateText({
			model: createModel({ id: MODEL_ID, apiKey: 'test-key' }, fetch),
			prompt: 'Hello',
			reasoning: 'high',
			providerOptions,
		});
		const body = JSON.parse(fetch.mock.calls[0][1]?.body as string);
		expect(body).toMatchObject(providerOptions.openrouter);
		expect(body.reasoning).not.toHaveProperty('effort');
		expect(providerOptions.openrouter.reasoning).not.toHaveProperty('effort');
	});
});
