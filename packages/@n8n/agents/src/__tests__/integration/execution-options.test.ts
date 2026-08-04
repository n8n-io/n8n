import { expect, it, vi } from 'vitest';
import { z } from 'zod';

import { collectStreamChunks, describeIf, getModel } from './helpers';
import { Agent, Tool, type AgentExecutionCounter } from '../../index';

const describe = describeIf('anthropic');

describe('execution options integration', () => {
	it('uses Agent.modelFetch for model requests', async () => {
		const fetchCalls: string[] = [];
		const proxyFetch: typeof fetch = async (input, init) => {
			fetchCalls.push(requestUrl(input));
			return await fetch(input, init);
		};

		const agent = new Agent('model-fetch-test')
			.model(getModel('anthropic'))
			.modelFetch(proxyFetch)
			.instructions('You are a concise assistant. Reply with one short sentence.');

		const result = await agent.generate('Say hello.');

		expect(result.finishReason).toBe('stop');
		expect(fetchCalls.length).toBeGreaterThan(0);
	});

	it('calls onStepStart and onStepFinish for generate and stream', async () => {
		const generateStepStart = vi.fn();
		const generateStepFinish = vi.fn();
		const streamStepStart = vi.fn();
		const streamStepFinish = vi.fn();
		const agent = new Agent('step-callback-test')
			.model(getModel('anthropic'))
			.instructions('You are a concise assistant. Reply with one short sentence.');

		const generateResult = await agent.generate('Say generate.', {
			onStepStart: generateStepStart,
			onStepFinish: generateStepFinish,
		});
		expect(generateResult.finishReason).toBe('stop');

		const { stream } = await agent.stream('Say stream.', {
			onStepStart: streamStepStart,
			onStepFinish: streamStepFinish,
		});
		await collectStreamChunks(stream);

		expect(generateStepStart).toHaveBeenCalled();
		expect(generateStepFinish).toHaveBeenCalled();
		expect(streamStepStart).toHaveBeenCalled();
		expect(streamStepFinish).toHaveBeenCalled();
	});

	it('increments executionCounter for messages, tool calls, and tokens', async () => {
		const counts = { messages: 0, toolCalls: 0, tokens: 0 };
		const executionCounter: AgentExecutionCounter = {
			incrementMessageCount: () => counts.messages++,
			incrementToolCallCount: () => counts.toolCalls++,
			incrementTokenCount: (tokenCount) => {
				counts.tokens += tokenCount;
			},
		};

		const addTool = new Tool('add_numbers')
			.description('Add two numbers together and return the result.')
			.input(
				z.object({
					a: z.number().describe('First number'),
					b: z.number().describe('Second number'),
				}),
			)
			.output(z.object({ result: z.number() }))
			.handler(async ({ a, b }) => ({ result: a + b }));

		const agent = new Agent('execution-counter-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a calculator. When asked to add numbers, call add_numbers with the exact numbers. Do not calculate mentally.',
			)
			.tool(addTool);

		const result = await agent.generate(
			'Call add_numbers exactly once with a=9 and b=4, then answer with the result.',
			{ executionCounter },
		);

		expect(result.finishReason).toBe('stop');
		expect(result.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ tool: 'add_numbers', output: { result: 13 } }),
			]),
		);
		expect(counts.messages).toBeGreaterThan(0);
		expect(counts.toolCalls).toBeGreaterThan(0);
		expect(counts.tokens).toBeGreaterThan(0);
	});
});

function requestUrl(input: Parameters<typeof fetch>[0]): string {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.toString();
	return input.url;
}
