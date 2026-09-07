import { expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, getModel, collectStreamChunks, chunksOfType } from './helpers';
import { Agent, Memory, Tool } from '../../index';

const describe = describeIf('anthropic');

/**
 * Integration tests for error resilience in processToolCall transforms.
 *
 * Two bugs under test:
 *
 * 1. toModelOutput throwing during a normal tool call — the agent should treat it
 *    as a tool error and let the LLM self-correct, not crash.
 *
 * 2. toModelOutput throwing during a RESUMED tool call — without the fix, this
 *    causes iteratePendingToolCallsConcurrent to propagate the rejection, which
 *    closes the stream via closeStreamWithError and skips memory persistence.
 *    With the fix, the error is captured and the stream continues normally.
 */
describe('tool transform error resilience', () => {
	it('toModelOutput throwing during normal tool call — agent continues and finishes cleanly', async () => {
		const fetchTool = new Tool('fetch_data')
			.description('Fetch some data. Always succeeds but transform throws.')
			.input(z.object({ id: z.string().describe('Resource ID') }))
			.handler(async ({ id }) => ({ id, value: 42 }))
			.toModelOutput(() => {
				throw new Error('toModelOutput failed intentionally');
			});

		const agent = new Agent('transform-error-normal-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a data fetcher. Use fetch_data to get data. ' +
					'If the tool fails with an error, acknowledge it and say what happened. Be concise.',
			)
			.tool(fetchTool);

		const result = await agent.generate('Fetch data with id "test-1"');

		// The agent must not throw — it should continue and acknowledge the error
		expect(result.finishReason).toBe('stop');
		expect(result.messages.length).toBeGreaterThan(0);
	});

	it('toModelOutput throwing during normal tool call in stream() — stream finishes with stop, not error', async () => {
		const fetchTool = new Tool('fetch_data')
			.description('Fetch some data. Transform always throws.')
			.input(z.object({ id: z.string().describe('Resource ID') }))
			.handler(async ({ id }) => ({ id, value: 99 }))
			.toModelOutput(() => {
				throw new Error('toModelOutput failed in stream');
			});

		const agent = new Agent('transform-error-stream-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a data fetcher. Use fetch_data to get data. ' +
					'If the tool errors, acknowledge it. Be concise.',
			)
			.tool(fetchTool);

		const { stream } = await agent.stream('Fetch data with id "stream-1"');
		const chunks = await collectStreamChunks(stream);

		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);
		expect(finishChunks[finishChunks.length - 1].finishReason).not.toBe('error');
	});

	it('toModelOutput throwing during resumed tool call — stream does not close with error and messages are saved to memory', async () => {
		const { memory } = { memory: new Memory().storage('memory') };

		const approveTool = new Tool('approve_action')
			.description('Request approval for an action. Suspends for human review.')
			.input(z.object({ action: z.string().describe('Action to approve') }))
			.output(z.object({ approved: z.boolean(), action: z.string() }))
			.suspend(z.object({ question: z.string() }))
			.resume(z.object({ confirmed: z.boolean() }))
			.handler(async ({ action }, ctx) => {
				if (!ctx.resumeData) {
					return await ctx.suspend({ question: `Approve "${action}"?` });
				}
				return { approved: ctx.resumeData.confirmed, action };
			})
			.toModelOutput(() => {
				// Always throws — simulates a broken transform on the resumed call
				throw new Error('toModelOutput failed on resume intentionally');
			});

		const agent = new Agent('transform-error-resume-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are an approval manager. Use approve_action when asked to perform an action. ' +
					'If the tool errors, acknowledge it and say what happened. Be concise.',
			)
			.tool(approveTool)
			.memory(memory)
			.checkpoint('memory');

		const threadId = `test-transform-resume-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'test-user' } };

		// Turn 1: stream — agent should call the tool, which suspends
		const result1 = await agent.stream('Please approve the action "deploy to production"', options);
		const chunks1 = await collectStreamChunks(result1.stream);

		const suspendChunk = chunksOfType(chunks1, 'tool-call-suspended')[0];
		expect(suspendChunk).toBeDefined();

		// Turn 2: resume — tool returns a result, but toModelOutput throws
		// Bug (without fix): stream closes with finishReason 'error' via closeStreamWithError
		// Fix: error is captured as a tool error, stream continues, LLM responds
		const result2 = await agent.resume(
			'stream',
			{ confirmed: true },
			{ runId: suspendChunk.runId, toolCallId: suspendChunk.toolCallId },
		);
		const chunks2 = await collectStreamChunks(result2.stream);

		const finishChunks = chunksOfType(chunks2, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);
		// The stream must NOT end with 'error' — the transform error must be contained
		expect(finishChunks[finishChunks.length - 1].finishReason).not.toBe('error');

		// The tool-result chunk in the resumed stream should carry isError: true
		const toolResults = chunksOfType(chunks2, 'tool-result');
		const approveResult = toolResults.find((c) => c.toolName === 'approve_action');
		expect(approveResult).toBeDefined();
		expect(approveResult!.isError).toBe(true);
	});
});
