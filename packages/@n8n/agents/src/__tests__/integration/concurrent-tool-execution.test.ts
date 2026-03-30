import { expect, it } from 'vitest';

import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	createAgentWithConcurrentInterruptibleCalls,
	createAgentWithConcurrentMixedTools,
	collectTextDeltas,
} from './helpers';
import { isLlmMessage, type StreamChunk } from '../../index';

const describe = describeIf('anthropic');

describe('concurrent tool execution integration', () => {
	it('suspends all interruptible tool calls concurrently and returns them as an array (generate)', async () => {
		const agent = createAgentWithConcurrentInterruptibleCalls('anthropic');

		const result = await agent.generate(
			'Delete these two files: /tmp/a.txt and /tmp/b.txt. You MUST call delete_file for each file in a single turn using parallel tool calls.',
		);

		expect(result.finishReason).toBe('tool-calls');
		expect(result.pendingSuspend).toBeDefined();
		// With concurrent execution, ALL interruptible tool calls suspend at once
		expect(result.pendingSuspend!.length).toBeGreaterThanOrEqual(2);

		const toolNames = result.pendingSuspend!.map((s) => s.toolName);
		expect(toolNames.every((n) => n === 'delete_file')).toBe(true);

		// All entries share the same runId
		const runIds = new Set(result.pendingSuspend!.map((s) => s.runId));
		expect(runIds.size).toBe(1);

		// Each entry has a unique toolCallId and a suspendPayload
		const toolCallIds = result.pendingSuspend!.map((s) => s.toolCallId);
		expect(new Set(toolCallIds).size).toBe(result.pendingSuspend!.length);

		for (const s of result.pendingSuspend!) {
			expect(s.suspendPayload).toEqual(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				expect.objectContaining({ message: expect.any(String), severity: 'destructive' }),
			);
		}
	});

	it('suspends all interruptible tool calls concurrently and emits multiple chunks (stream)', async () => {
		const agent = createAgentWithConcurrentInterruptibleCalls('anthropic');

		const { stream: fullStream } = await agent.stream(
			'Delete these two files: /tmp/a.txt and /tmp/b.txt. You MUST call delete_file for each file in a single turn using parallel tool calls.',
		);

		const chunks = await collectStreamChunks(fullStream);
		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');

		// With concurrent execution, ALL suspensions are emitted before finish
		expect(suspendedChunks.length).toBeGreaterThanOrEqual(2);

		// Each suspended chunk has a unique toolCallId
		const toolCallIds = suspendedChunks.map((c) => c.toolCallId);
		expect(new Set(toolCallIds).size).toBe(suspendedChunks.length);

		// All share the same runId
		const runIds = new Set(suspendedChunks.map((c) => c.runId));
		expect(runIds.size).toBe(1);

		// A single finish chunk follows the suspended chunks
		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks.length).toBe(1);
		expect(finishChunks[0].finishReason).toBe('tool-calls');
	});

	it('resume resolves one tool at a time, carrying forward the rest (generate)', async () => {
		const agent = createAgentWithConcurrentInterruptibleCalls('anthropic');

		const first = await agent.generate(
			'Delete these two files: /tmp/a.txt and /tmp/b.txt. You MUST call delete_file for each file in a single turn using parallel tool calls.',
		);

		expect(first.pendingSuspend!.length).toBeGreaterThanOrEqual(2);

		const { runId } = first.pendingSuspend![0];
		const firstToolCallId = first.pendingSuspend![0].toolCallId;

		// Resume the first tool
		const second = await agent.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId: firstToolCallId },
		);

		// The remaining tool(s) should still be pending
		expect(second.pendingSuspend).toBeDefined();
		expect(second.pendingSuspend!.length).toBe(first.pendingSuspend!.length - 1);

		// The resumed tool should NOT be in the remaining list
		const remainingIds = second.pendingSuspend!.map((s) => s.toolCallId);
		expect(remainingIds).not.toContain(firstToolCallId);
	});

	it('resumes all suspended tools one by one until the LLM loop continues (stream)', async () => {
		const agent = createAgentWithConcurrentInterruptibleCalls('anthropic');

		const { stream: fullStream } = await agent.stream(
			'Delete these two files: /tmp/a.txt and /tmp/b.txt. You MUST call delete_file for each file in a single turn using parallel tool calls. After deleting all files, tell me if you succeeded.',
		);

		const chunks = await collectStreamChunks(fullStream);
		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendedChunks.length).toBeGreaterThanOrEqual(2);

		// Resume each one until no suspensions remain
		let pendingSuspensions = suspendedChunks as Array<
			StreamChunk & { type: 'tool-call-suspended' }
		>;

		while (pendingSuspensions.length > 0) {
			const next = pendingSuspensions[0];
			const resumedStream = await agent.resume(
				'stream',
				{ approved: true },
				{ runId: next.runId!, toolCallId: next.toolCallId! },
			);

			const resumedChunks = await collectStreamChunks(resumedStream.stream);
			pendingSuspensions = chunksOfType(resumedChunks, 'tool-call-suspended');

			// If there are no more suspensions, the LLM should have produced text
			if (pendingSuspensions.length === 0) {
				const errorChunks = resumedChunks.filter((c) => c.type === 'error');
				expect(errorChunks).toHaveLength(0);

				const finishChunks = chunksOfType(resumedChunks, 'finish');
				expect(finishChunks.length).toBeGreaterThan(0);
				expect(finishChunks[0].finishReason).not.toBe('error');
			}
		}
	});

	it('auto-executes non-interruptible tools concurrently while suspending interruptible ones', async () => {
		const agent = createAgentWithConcurrentMixedTools('anthropic');

		const { stream: fullStream } = await agent.stream(
			'You must call both tools in parallel: call list_files with dir="/home" AND call delete_file with path="/home/readme.md". Do not skip either tool.',
		);

		const chunks = await collectStreamChunks(fullStream);

		// list_files should auto-execute — its result should appear as a message chunk
		const toolResultChunks = chunks.filter(
			(c) =>
				c.type === 'message' &&
				isLlmMessage(c.message) &&
				c.message.content.some((p) => p.type === 'tool-result'),
		);

		// delete_file should be suspended
		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		const deleteSuspended = suspendedChunks.find((c) => c.toolName === 'delete_file');

		expect(deleteSuspended).toBeDefined();
		expect(toolResultChunks.length).toBeGreaterThan(0);
		// If the LLM issued both tool calls in parallel:
		if (deleteSuspended && toolResultChunks.length > 0) {
			expect(deleteSuspended.toolName).toBe('delete_file');
			expect(deleteSuspended.suspendPayload).toEqual(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				expect.objectContaining({ message: expect.any(String) }),
			);

			// list_files result should be present even though delete_file suspended
			const listResult = toolResultChunks.find(
				(c) =>
					c.type === 'message' &&
					isLlmMessage(c.message) &&
					c.message.content.some((p) => p.type === 'tool-result' && p.toolName === 'list_files'),
			);
			expect(listResult).toBeDefined();
		}
	});

	it('generate: resumes all tools and receives a final text response', async () => {
		const agent = createAgentWithConcurrentInterruptibleCalls('anthropic');

		let result = await agent.generate(
			'Delete these two files: /tmp/a.txt and /tmp/b.txt. You MUST call delete_file for each file in a single turn using parallel tool calls. After deleting, confirm success.',
		);

		// Iterate through all pending suspensions
		while (result.pendingSuspend && result.pendingSuspend.length > 0) {
			const { runId, toolCallId } = result.pendingSuspend[0];
			result = await agent.resume('generate', { approved: true }, { runId, toolCallId });
		}

		// After all tools resumed, the agent should complete with a text response
		expect(result.finishReason).toBe('stop');
		expect(result.pendingSuspend).toBeUndefined();

		const text = collectTextDeltas(
			result.messages
				.filter((m) => 'role' in m && m.role === 'assistant')
				.flatMap((m) =>
					'content' in m
						? m.content
								.filter((c) => c.type === 'text')
								.map((c) => ({ type: 'text-delta' as const, delta: c.text }))
						: [],
				),
		);
		expect(text.length).toBeGreaterThan(0);
	});
});
