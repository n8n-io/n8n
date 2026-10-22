import { listModelsForProvider } from '@n8n/ai-utilities/model-discovery';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { chunksOfType, collectStreamChunks, collectTextDeltas } from './helpers';
import { IS_REPLAY_MODE } from './vcr';
import { Agent, Tool } from '../../index';

// Install gemma4 with Ollama, then set OLLAMA_TESTS=true to run or record locally.
describe.runIf(IS_REPLAY_MODE || process.env.OLLAMA_TESTS === 'true')('Ollama', () => {
	const model = { id: 'ollama/gemma4:latest', baseURL: 'http://localhost:11434' };

	it('discovers installed models with native metadata', async () => {
		const models = await listModelsForProvider('ollama', { apiKey: '', baseURL: model.baseURL });
		expect(models).toContainEqual(
			expect.objectContaining({
				id: 'gemma4:latest',
				name: 'gemma4:latest',
				metadata: expect.objectContaining({
					toolCall: true,
					reasoning: true,
					limits: { context: expect.any(Number) },
				}),
			}),
		);
	});

	it('generates a response without an API key', async () => {
		const agent = new Agent('ollama-generate-test')
			.model(model)
			.thinking('ollama', { reasoningEffort: 'none' })
			.instructions('Reply with exactly OK.');
		const result = await agent.generate('Acknowledge.');
		expect(result.error).toBeUndefined();
		expect(result.finishReason).toBe('stop');
		expect(result.usage?.totalTokens).toBeGreaterThan(0);
	});

	it('streams a response and token usage', async () => {
		const agent = new Agent('ollama-stream-test')
			.model(model)
			.instructions('Reply with exactly OK.');
		const { stream } = await agent.stream('Acknowledge.');
		const chunks = await collectStreamChunks(stream);
		expect(chunksOfType(chunks, 'error')).toEqual([]);
		expect(collectTextDeltas(chunks).trim()).toMatch(/^OK[.!]?$/);
		expect(chunksOfType(chunks, 'finish').at(-1)).toMatchObject({ finishReason: 'stop' });
		expect(chunksOfType(chunks, 'finish').at(-1)?.usage?.totalTokens).toBeGreaterThan(0);
	});

	it('returns structured output', async () => {
		const agent = new Agent('ollama-structured-test')
			.model(model)
			.instructions('Extract the city. Respond with a JSON object containing a city string.')
			.structuredOutput(z.object({ city: z.string() }));
		const result = await agent.generate('The city is London.');
		expect(result.error).toBeUndefined();
		expect(result.structuredOutput).toEqual({ city: 'London' });
	});

	it('executes a tool and continues the stream', async () => {
		const addNumbers = new Tool('add_numbers')
			.description('Add two numbers.')
			.input(z.object({ a: z.number(), b: z.number() }))
			.handler(async ({ a, b }) => ({ result: a + b }));
		const agent = new Agent('ollama-tool-test')
			.model(model)
			.instructions('Use add_numbers for arithmetic. Reply with only the result.')
			.tool(addNumbers);
		const { stream } = await agent.stream('Add 17 and 25.');
		const chunks = await collectStreamChunks(stream);
		expect(chunksOfType(chunks, 'error')).toEqual([]);
		expect(chunksOfType(chunks, 'tool-result')).toEqual([
			expect.objectContaining({ output: { result: 42 } }),
		]);
		expect(collectTextDeltas(chunks).trim()).toBe('42');
		expect(chunksOfType(chunks, 'finish').at(-1)).toMatchObject({ finishReason: 'stop' });
	});
});
