import { expect, it } from 'vitest';
import { z } from 'zod';

import {
	chunksOfType,
	collectStreamChunks,
	collectTextDeltas,
	describeIf,
	getModel,
} from './helpers';
import { Agent, Tool } from '../../index';

const describe = describeIf('anthropic');

describe('deferred tools integration', () => {
	it('searches, loads, and uses a deferred tool in generate mode', async () => {
		const multiplyTool = new Tool('multiply_numbers')
			.description('Multiply two numbers and return their product')
			.input(
				z.object({
					a: z.number().describe('First number'),
					b: z.number().describe('Second number'),
				}),
			)
			.output(z.object({ product: z.number() }))
			.handler(async ({ a, b }) => ({ product: a * b }));

		const agent = new Agent('deferred-generate-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are testing deferred tool discovery. For arithmetic requests, first call search_tools, then call load_tool with the exact returned tool name, then call the loaded tool. Do not answer from mental math.',
			)
			.deferredTool(multiplyTool, { search: { topK: 2 } });

		const result = await agent.generate(
			'Use deferred tools to multiply 6 and 7. Search for the tool, load it, call it, then answer with the product.',
		);

		const toolNames = result.toolCalls?.map((toolCall) => toolCall.tool) ?? [];
		expect(toolNames).toEqual(
			expect.arrayContaining(['search_tools', 'load_tool', 'multiply_numbers']),
		);

		const multiplyCall = result.toolCalls?.find((toolCall) => toolCall.tool === 'multiply_numbers');
		expect(multiplyCall?.output).toEqual({ product: 42 });
	});

	it('searches, loads, and uses a deferred tool in stream mode', async () => {
		const countCharactersTool = new Tool('count_characters')
			.description('Count the characters in a text string')
			.input(z.object({ text: z.string().describe('Text to count') }))
			.output(z.object({ length: z.number() }))
			.handler(async ({ text }) => ({ length: text.length }));

		const agent = new Agent('deferred-stream-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are testing deferred tool discovery. For character counting requests, first call search_tools, then call load_tool with the exact returned tool name, then call the loaded tool. Do not count manually.',
			)
			.deferredTool(countCharactersTool);

		const { stream } = await agent.stream(
			'Use deferred tools to count the characters in the text "n8n". Search for the tool, load it, call it, then answer with the length.',
		);

		const chunks = await collectStreamChunks(stream);
		const toolResults = chunksOfType(chunks, 'tool-result');
		const toolNames = toolResults.map((toolResult) => toolResult.toolName);

		expect(toolNames).toEqual(
			expect.arrayContaining(['search_tools', 'load_tool', 'count_characters']),
		);

		const countResult = toolResults.find(
			(toolResult) => toolResult.toolName === 'count_characters',
		);
		expect(countResult?.output).toEqual({ length: 3 });
		expect(collectTextDeltas(chunks)).toMatch(/3/);
	});

	it('resumes a suspended deferred tool after loading it', async () => {
		const deleteTool = new Tool('delete_temp_file')
			.description('Delete a temporary file at a requested path after approval')
			.input(z.object({ path: z.string().describe('Temporary file path to delete') }))
			.output(z.object({ deleted: z.boolean(), path: z.string() }))
			.suspend(z.object({ message: z.string(), severity: z.string() }))
			.resume(z.object({ approved: z.boolean() }))
			.handler(async ({ path }, ctx) => {
				if (!ctx.resumeData) {
					return await ctx.suspend({
						message: `Delete temporary file "${path}"?`,
						severity: 'destructive',
					});
				}

				if (!ctx.resumeData.approved) return { deleted: false, path };
				return { deleted: true, path };
			});

		const agent = new Agent('deferred-suspend-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are testing deferred tool discovery with approval. When asked to delete a temporary file, first call search_tools, then call load_tool with the exact returned tool name, then call delete_temp_file. Do not skip the tool.',
			)
			.deferredTool(deleteTool)
			.checkpoint('memory');

		const firstResult = await agent.generate(
			'Use deferred tools to delete /tmp/deferred-tool-test.txt. Search for the tool, load it, and call it with that exact path.',
		);

		expect(firstResult.pendingSuspend).toHaveLength(1);
		expect(firstResult.pendingSuspend![0].toolName).toBe('delete_temp_file');

		const resumeResult = await agent.resume(
			'generate',
			{ approved: true },
			{
				runId: firstResult.pendingSuspend![0].runId,
				toolCallId: firstResult.pendingSuspend![0].toolCallId,
			},
		);

		expect(resumeResult.finishReason).not.toBe('error');
		expect(resumeResult.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					tool: 'delete_temp_file',
					output: { deleted: true, path: '/tmp/deferred-tool-test.txt' },
				}),
			]),
		);
	});
});
