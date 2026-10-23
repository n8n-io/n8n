import { expect, it } from 'vitest';
import { z } from 'zod';

import { chunksOfType, collectStreamChunks, collectTextDeltas, describeIf } from './helpers';
import { Agent, Tool } from '../../index';

const describe = describeIf('vercel');
const model = {
	id: 'vercel/openai/gpt-4.1-nano',
	apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY,
};

describe('Vercel AI Gateway', () => {
	// AGENT-1182: n8n credentials use the OpenAI-compatible URL, not the native SDK URL.
	it('reports the resource error when the native SDK uses the OpenAI-compatible URL', async () => {
		const agent = new Agent('vercel-url-test')
			.model({
				...model,
				id: 'vercel/anthropic/claude-sonnet-5.5',
				baseURL: 'https://ai-gateway.vercel.sh/v1',
			})
			.instructions('Reply with exactly OK.');

		const { stream } = await agent.stream('Acknowledge.');
		const chunks = await collectStreamChunks(stream);

		expect(chunksOfType(chunks, 'error')).toEqual([
			expect.objectContaining({
				error: expect.objectContaining({
					message: 'The requested resource was not found: /v1/language-model',
				}),
			}),
		]);
	});

	it('generates a response through the native gateway', async () => {
		const agent = new Agent('vercel-generate-test')
			.model(model)
			.instructions('Reply with exactly OK.');

		const result = await agent.generate('Acknowledge.');

		expect(result.error).toBeUndefined();
		expect(result.finishReason).toBe('stop');
		expect(result.usage?.totalTokens).toBeGreaterThan(0);
	});

	it('streams a response through the native gateway', async () => {
		const agent = new Agent('vercel-stream-test')
			.model(model)
			.instructions('Reply with exactly OK.');

		const { stream } = await agent.stream('Acknowledge.');
		const chunks = await collectStreamChunks(stream);

		expect(chunksOfType(chunks, 'error')).toHaveLength(0);
		expect(collectTextDeltas(chunks)).toBe('OK');
		expect(chunksOfType(chunks, 'finish').at(-1)).toMatchObject({ finishReason: 'stop' });
	});

	it('executes a tool and continues the stream through the native gateway', async () => {
		const addNumbers = new Tool('add_numbers')
			.description('Add two numbers.')
			.input(z.object({ a: z.number(), b: z.number() }))
			.handler(async ({ a, b }) => ({ result: a + b }));
		const agent = new Agent('vercel-tool-test')
			.model(model)
			.instructions('Use add_numbers for arithmetic. Reply with only the result.')
			.tool(addNumbers);

		const { stream } = await agent.stream('Add 17 and 25.');
		const chunks = await collectStreamChunks(stream);

		expect(chunksOfType(chunks, 'error')).toHaveLength(0);
		expect(chunksOfType(chunks, 'tool-result')).toEqual([
			expect.objectContaining({ output: { result: 42 } }),
		]);
		expect(collectTextDeltas(chunks)).toBe('42');
		expect(chunksOfType(chunks, 'finish').at(-1)).toMatchObject({ finishReason: 'stop' });
	});
});
