import { expect, it } from 'vitest';
import { z } from 'zod';

import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	createAgentWithAddTool,
	getModel,
	findTextContent,
} from './helpers';
import { Agent, Tool } from '../../index';

const describe = describeIf('anthropic');

describe('streamText integration', () => {
	it('streams text deltas for a simple prompt', async () => {
		const agent = new Agent('text-test')
			.model(getModel('anthropic'))
			.instructions('Reply with exactly: "Hello world". Nothing else.');

		const { fullStream, getResult } = await agent.streamText('Say hello');

		const chunks = await collectStreamChunks(fullStream);
		const textChunks = chunksOfType(chunks, 'text-delta');

		expect(textChunks.length).toBeGreaterThan(0);

		for (const chunk of textChunks) {
			expect(typeof chunk.payload?.text).toBe('string');
		}

		const result = await getResult();
		expect(findTextContent(result.messages)).toBeTruthy();
		expect(result.usage?.promptTokens).toBeGreaterThan(0);
		expect(result.usage?.completionTokens).toBeGreaterThan(0);
	});

	it('executes a tool and streams tool events', async () => {
		const agent = createAgentWithAddTool('anthropic');

		const { fullStream, getResult } = await agent.streamText('What is 2 + 3?');

		const chunks = await collectStreamChunks(fullStream);
		const chunkTypes = chunks.map((c) => c.type);

		expect(chunkTypes).toContain('tool-call');
		expect(chunkTypes).toContain('tool-result');

		const toolCallChunks = chunksOfType(chunks, 'tool-call');
		expect(toolCallChunks.length).toBeGreaterThan(0);
		expect(toolCallChunks[0].payload?.toolName).toBe('add_numbers');

		const toolResultChunks = chunksOfType(chunks, 'tool-result');
		expect(toolResultChunks.length).toBeGreaterThan(0);
		expect(toolResultChunks[0].payload?.result).toEqual({ result: 5 });

		const textChunks = chunksOfType(chunks, 'text-delta');
		expect(textChunks.length).toBeGreaterThan(0);

		const result = await getResult();
		expect(findTextContent(result.messages)).toContain('5');
	});

	it('streams tool-call-delta chunks with argsTextDelta', async () => {
		const agent = new Agent('delta-test')
			.model(getModel('anthropic'))
			.instructions('When asked to add numbers, use the add_numbers tool.')
			.tool(
				new Tool('add_numbers')
					.description('Add two numbers')
					.input(
						z.object({
							a: z.number().describe('First number'),
							b: z.number().describe('Second number'),
						}),
					)
					.handler(async ({ a, b }) => ({ result: a + b })),
			);

		const { fullStream } = await agent.streamText('Add 17 and 25');

		const chunks = await collectStreamChunks(fullStream);

		// Log all chunk types for debugging
		const allTypes = [...new Set(chunks.map((c) => c.type))];
		console.log('Unique chunk types:', allTypes.join(', '));

		const deltaChunks = chunksOfType(chunks, 'tool-call-delta');

		expect(deltaChunks.length).toBeGreaterThan(0);

		const fullArgs = deltaChunks.map((c) => c.payload?.argsTextDelta ?? '').join('');

		const parsed = JSON.parse(fullArgs) as { a: number; b: number };
		expect(parsed.a).toBe(17);
		expect(parsed.b).toBe(25);

		const startChunks = chunksOfType(chunks, 'tool-call-input-streaming-start');
		expect(startChunks.length).toBeGreaterThan(0);
		expect(startChunks[0].payload?.toolName).toBe('add_numbers');
	});

	it('handles structured output', async () => {
		const schema = z.object({
			answer: z.number(),
			explanation: z.string(),
		});

		const agent = new Agent('structured-test')
			.model(getModel('anthropic'))
			.instructions('Answer math questions.')
			.structuredOutput(schema);

		const { getResult } = await agent.streamText('What is 10 * 5?');
		const result = await getResult();

		expect(result.output).toBeDefined();
		const output = result.output as { answer: number; explanation: string };
		expect(output.answer).toBe(50);
		expect(typeof output.explanation).toBe('string');
	});
});
