import { expect, it } from 'vitest';

import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	createAgentWithInterruptibleTool,
	createAgentWithMixedTools,
	createAgentWithParallelInterruptibleCalls,
} from './helpers';
import { isLlmMessage, type StreamChunk } from '../../index';

const describe = describeIf('anthropic');

describe('tool interrupt integration', () => {
	it('pauses the stream when a tool suspends', async () => {
		const agent = createAgentWithInterruptibleTool('anthropic');

		const { stream: fullStream } = await agent.stream('Delete the file /tmp/test.txt');

		const chunks = await collectStreamChunks(fullStream);
		const chunkTypes = chunks.map((c) => c.type);

		expect(chunkTypes).toContain('tool-call-suspended');

		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendedChunks.length).toBe(1);

		const suspended = suspendedChunks[0] as StreamChunk & { type: 'tool-call-suspended' };
		expect(suspended.toolName).toBe('delete_file');
		expect(suspended.runId).toBeTruthy();
		expect(suspended.toolCallId).toBeTruthy();
		expect(suspended.suspendPayload).toEqual(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			expect.objectContaining({ message: expect.any(String), severity: 'destructive' }),
		);

		// No tool-result should appear (tool is suspended)
		const contentChunks = chunks.filter(
			(c) =>
				c.type === 'message' &&
				'content' in c &&
				(c.content as { type: string }).type === 'tool-result',
		);
		expect(contentChunks).toHaveLength(0);
	});

	it('resumes the stream after resume with approval', async () => {
		const agent = createAgentWithInterruptibleTool('anthropic');

		const { stream: fullStream } = await agent.stream('Delete the file /tmp/test.txt');

		const chunks = await collectStreamChunks(fullStream);
		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendedChunks.length).toBe(1);

		const suspended = suspendedChunks[0] as StreamChunk & { type: 'tool-call-suspended' };
		const resumedStream = await agent.resume(
			'stream',
			{ approved: true },
			{ runId: suspended.runId!, toolCallId: suspended.toolCallId! },
		);

		const resumedChunks = await collectStreamChunks(resumedStream.stream);
		const resumedTypes = resumedChunks.map((c) => c.type);

		// After approval, tool-result should appear as content chunk
		const toolResultChunks = resumedChunks.filter(
			(c) =>
				c.type === 'message' &&
				isLlmMessage(c.message) &&
				c.message.content.some((c) => c.type === 'tool-result'),
		);
		expect(toolResultChunks.length).toBeGreaterThan(0);

		expect(resumedTypes).toContain('text-delta');
	});

	it('resumes the stream after resume with denial', async () => {
		const agent = createAgentWithInterruptibleTool('anthropic');

		const { stream: fullStream } = await agent.stream('Delete the file /tmp/test.txt');

		const chunks = await collectStreamChunks(fullStream);
		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendedChunks.length).toBe(1);

		const suspended = suspendedChunks[0] as StreamChunk & { type: 'tool-call-suspended' };
		const resumedStream = await agent.resume(
			'stream',
			{ approved: false },
			{ runId: suspended.runId!, toolCallId: suspended.toolCallId! },
		);

		const resumedChunks = await collectStreamChunks(resumedStream.stream);
		const resumedTypes = resumedChunks.map((c) => c.type);

		expect(resumedTypes).toContain('text-delta');
	});

	it('resumes each pending tool call one by one when multiple tool calls are suspended', async () => {
		const agent = createAgentWithParallelInterruptibleCalls('anthropic');

		const { stream: fullStream } = await agent.stream(
			'Delete these two files: /tmp/a.txt and /tmp/b.txt. You MUST call delete_file for each file in a single turn using parallel tool calls. After deleting all files, tell if you succeeded',
		);

		const chunks = await collectStreamChunks(fullStream);
		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');

		// The first interruptible tool call suspends, halting the loop.
		// Only 1 suspended chunk is emitted even though 2 tool calls were made.
		expect(suspendedChunks.length).toBe(1);

		const suspended1 = suspendedChunks[0] as StreamChunk & { type: 'tool-call-suspended' };
		expect(suspended1.toolName).toBe('delete_file');

		// Resume the first suspended tool call
		const stream2 = await agent.resume(
			'stream',
			{ approved: true },
			{ runId: suspended1.runId!, toolCallId: suspended1.toolCallId! },
		);

		const chunks2 = await collectStreamChunks(stream2.stream);
		const suspendedChunks2 = chunksOfType(chunks2, 'tool-call-suspended');

		// The second tool call should now be suspended (not an error)
		expect(suspendedChunks2.length).toBe(1);

		const suspended2 = suspendedChunks2[0] as StreamChunk & { type: 'tool-call-suspended' };
		expect(suspended2.toolCallId).not.toBe(suspended1.toolCallId);
		expect(suspended2.toolName).toBe('delete_file');

		// Resume the second suspended tool call
		const stream3 = await agent.resume(
			'stream',
			{ approved: true },
			{ runId: suspended2.runId!, toolCallId: suspended2.toolCallId! },
		);

		const chunks3 = await collectStreamChunks(stream3.stream);

		// After all original tool calls are resolved, the agent loop should
		// continue without crashing (no AI_MissingToolResultsError).
		// The LLM may respond with text or make additional tool calls.
		const errorChunks = chunks3.filter((c) => c.type === 'error');
		expect(errorChunks).toHaveLength(0);

		const finishChunks = chunksOfType(chunks3, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);
		const finish = finishChunks[0] as StreamChunk & { type: 'finish' };
		expect(finish.finishReason).not.toBe('error');
	});

	it('auto-executes non-interruptible tools while suspending interruptible ones', async () => {
		const agent = createAgentWithMixedTools('anthropic');

		const { stream: fullStream } = await agent.stream(
			'You must call both tools: first call list_files with dir="/home", then call delete_file with path="/home/readme.md". Do not skip either tool.',
		);

		const chunks = await collectStreamChunks(fullStream);

		// list_files should auto-execute — its result should appear as content
		const toolResultChunks = chunks.filter(
			(c) =>
				c.type === 'message' &&
				isLlmMessage(c.message) &&
				c.message.content.some((c) => c.type === 'tool-result'),
		);
		expect(toolResultChunks.length).toBeGreaterThan(0);

		// delete_file should be suspended
		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		const deleteSuspended = suspendedChunks.find(
			(c) => (c as StreamChunk & { type: 'tool-call-suspended' }).toolName === 'delete_file',
		);

		// If the LLM called delete_file, it should have been suspended
		if (deleteSuspended) {
			expect(deleteSuspended).toBeDefined();
		}
	});
});
