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
			if (chunk.type === 'text-delta') {
				expect(typeof chunk.delta).toBe('string');
			}
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

		// Tool results come as 'content' chunks with content.type === 'tool-result'
		const toolResultChunks = chunks.filter(
			(c) =>
				c.type === 'content' &&
				'content' in c &&
				(c.content as { type: string }).type === 'tool-result',
		);
		expect(toolResultChunks.length).toBeGreaterThan(0);

		// Text deltas should be present
		expect(chunkTypes).toContain('text-delta');

		const result = await getResult();
		expect(findTextContent(result.messages)).toContain('5');
	});

	it('streams tool-call-delta chunks', async () => {
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

		const allTypes = [...new Set(chunks.map((c) => c.type))];
		console.log('Unique chunk types:', allTypes.join(', '));

		const deltaChunks = chunksOfType(chunks, 'tool-call-delta');
		expect(deltaChunks.length).toBeGreaterThan(0);
	});

	it('captures tool output for auto-approved tools via the approval wrapper', async () => {
		const { createAgentWithMixedTools } = await import('./helpers');
		const agent = createAgentWithMixedTools('anthropic');

		const { fullStream, getResult } = await agent.streamText('List files in /tmp');

		const reader = fullStream.getReader();
		while (true) {
			const { done } = await reader.read();
			if (done) break;
		}

		const result = await getResult();

		expect((result.toolCalls ?? []).length).toBeGreaterThan(0);

		const listCall = (result.toolCalls ?? []).find((tc) => tc.tool === 'list_files');
		expect(listCall).toBeDefined();

		expect(listCall!.output).toBeDefined();
		expect(listCall!.output).toEqual({
			files: ['readme.md', 'index.ts', 'package.json'],
			dir: '/tmp',
		});
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
