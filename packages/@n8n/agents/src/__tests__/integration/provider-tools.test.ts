import { expect, it } from 'vitest';
import { z } from 'zod';

import {
	describeIf,
	collectStreamChunks,
	getModel,
	chunksOfType,
	collectTextDeltas,
	findAllToolCalls,
} from './helpers';
import { Agent, Tool, providerTools, type StreamChunk } from '../../index';

const describe = describeIf('anthropic');

/**
 * Instructions that force the model to use web search before answering.
 * Required because the model may otherwise answer from its training data.
 */
const WEB_SEARCH_INSTRUCTIONS =
	'You MUST call the web_search tool before answering any question, even if you think you already know the answer. Never answer without searching first.';

describe('provider tools integration', () => {
	it('generate: the model calls the web search provider tool', async () => {
		const agent = new Agent('provider-tool-generate-test')
			.model(getModel('anthropic'))
			.instructions(WEB_SEARCH_INSTRUCTIONS)
			.providerTool(providerTools.anthropicWebSearch());

		const result = await agent.generate('What is the weather in Tokyo?');

		expect(result.finishReason).toBe('stop');
		expect(result.pendingSuspend).toBeUndefined();

		const toolCalls = findAllToolCalls(result.messages);
		const webSearchCall = toolCalls.find((tc) => tc.toolName.includes('web_search'));
		expect(webSearchCall).toBeDefined();
	});

	it('stream: the model calls the web search provider tool without suspending', async () => {
		const agent = new Agent('provider-tool-stream-test')
			.model(getModel('anthropic'))
			.instructions(WEB_SEARCH_INSTRUCTIONS)
			.providerTool(providerTools.anthropicWebSearch());

		const { stream } = await agent.stream('What is the weather in Tokyo?');
		const chunks = await collectStreamChunks(stream);

		// Provider tools must never cause a suspension
		const suspendChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendChunks.length).toBe(0);

		// Must finish cleanly
		const finishChunks = chunksOfType(chunks, 'finish');
		const lastFinish = finishChunks[finishChunks.length - 1];
		expect(lastFinish?.type === 'finish' && lastFinish.finishReason).toBe('stop');

		// Collect tool calls from message chunks
		const messageChunks = chunksOfType(chunks, 'message');
		const allMessages = messageChunks.map((c) => c.message);
		const toolCalls = findAllToolCalls(allMessages);
		const webSearchCall = toolCalls.find((tc) => tc.toolName.includes('web_search'));
		expect(webSearchCall).toBeDefined();

		// Must include a text response
		const text = collectTextDeltas(chunks);
		expect(text).toBeTruthy();
	});

	it('provider tool executes without interruption while a mixed-in interruptible tool suspends', async () => {
		const saveToDbTool = new Tool('save_to_db')
			.description('Save weather data to the database.')
			.input(z.object({ data: z.string().describe('The data to save') }))
			.output(z.object({ saved: z.boolean() }))
			.suspend(z.object({ message: z.string() }))
			.resume(z.object({ approved: z.boolean() }))
			.handler(async ({ data }, ctx) => {
				if (!ctx.resumeData) {
					return await ctx.suspend({ message: `Save "${data}" to the database?` });
				}
				return { saved: ctx.resumeData.approved };
			});

		const agent = new Agent('mixed-provider-hitl-test')
			.model(getModel('anthropic'))
			.instructions(
				'When asked about weather: first search the web for current weather, then call save_to_db with the result. You MUST call both tools.',
			)
			.providerTool(providerTools.anthropicWebSearch())
			.tool(saveToDbTool)
			.checkpoint('memory');

		const { stream } = await agent.stream(
			'Get the current weather in London and save the result to the database.',
		);
		const chunks = await collectStreamChunks(stream);
		// The web search provider tool must NOT cause a suspension
		// Only save_to_db (the interruptible tool) should suspend
		const suspendChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendChunks.length).toBe(1);

		const suspended = suspendChunks[0] as StreamChunk & { type: 'tool-call-suspended' };
		expect(suspended.toolName).toBe('save_to_db');
		expect(suspended.runId).toBeTruthy();
		expect(suspended.toolCallId).toBeTruthy();

		// The web search provider tool call should appear in the message history
		const messageChunks = chunksOfType(chunks, 'message');
		const toolCalls = findAllToolCalls(messageChunks.map((c) => c.message));
		const webSearchCall = toolCalls.find((tc) => tc.toolName.includes('web_search'));
		expect(webSearchCall).toBeDefined();

		// Resume with approval — agent should complete cleanly
		const resumeStream = await agent.resume(
			'stream',
			{ approved: true },
			{
				runId: suspended.runId!,
				toolCallId: suspended.toolCallId!,
			},
		);
		const resumeChunks = await collectStreamChunks(resumeStream.stream);

		// console.log('Second', JSON.stringify(resumeChunks, null, 2));
		const errorChunks = resumeChunks.filter((c) => c.type === 'error');
		expect(errorChunks).toHaveLength(0);

		const finishChunks = chunksOfType(resumeChunks, 'finish');
		const lastFinish = finishChunks[finishChunks.length - 1];
		expect(lastFinish?.type === 'finish' && lastFinish.finishReason).toBe('stop');
	});
});
