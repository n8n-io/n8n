import { expect, it } from 'vitest';

import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	createAgentWithBatchedInterruptibleCalls,
	createAgentWithBatchedNormalCalls,
} from './helpers';
import type { StreamChunk } from '../../index';

const describe = describeIf('anthropic');

describe('batched tool execution integration', () => {
	it('normal tools with bounded concurrency complete without errors (generate)', async () => {
		const agent = createAgentWithBatchedNormalCalls('anthropic', 2);

		const result = await agent.generate(
			'Check if these three files exist: /home/a.txt, /home/b.txt, /home/c.txt. You MUST call check_file for each file using parallel tool calls in the same turn.',
		);

		expect(result.finishReason).toBe('stop');
		expect(result.pendingSuspend).toBeUndefined();
		expect(result.toolCalls).toBeDefined();
		expect(result.toolCalls!.length).toBeGreaterThanOrEqual(3);

		for (const tc of result.toolCalls!) {
			expect(tc.tool).toBe('check_file');
			expect(tc.output).toEqual(expect.objectContaining({ exists: true }));
		}
	});

	it('normal tools with bounded concurrency complete without errors (stream)', async () => {
		const agent = createAgentWithBatchedNormalCalls('anthropic', 2);

		const { stream: fullStream } = await agent.stream(
			'Check if these three files exist: /home/a.txt, /home/b.txt, /home/c.txt. You MUST call check_file for each file using parallel tool calls in the same turn.',
		);

		const chunks = await collectStreamChunks(fullStream);

		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks).toHaveLength(0);

		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks.length).toBe(1);
		expect(finishChunks[0].finishReason).toBe('stop');

		expect(chunks.filter((c) => c.type === 'tool-call-suspended')).toHaveLength(0);
	});

	it('bounded concurrency suspends first batch and saves unexecuted tools, then resumes all (generate)', async () => {
		const agent = createAgentWithBatchedInterruptibleCalls('anthropic', 2);

		const first = await agent.generate(
			'Delete these three files: /tmp/a.txt, /tmp/b.txt, /tmp/c.txt. You MUST call delete_file for each file using parallel tool calls in the same turn. After deleting, confirm success.',
		);

		expect(first.finishReason).toBe('tool-calls');
		expect(first.pendingSuspend).toBeDefined();

		// With concurrency=2 and 3 tools: batch 1 runs 2 tools (both suspend),
		// batch 2 (1 tool) is skipped. So we get 2 suspended + 1 unexecuted.
		expect(first.pendingSuspend!.length).toBe(2);

		// Resume each suspension one at a time until the LLM loop continues.
		// The unexecuted tools from later batches should run during resume
		// and suspend in turn, so we expect multiple resume cycles.
		let result = first;
		let resumeCount = 0;

		while (result.pendingSuspend && result.pendingSuspend.length > 0) {
			const { runId, toolCallId } = result.pendingSuspend[0];
			result = await agent.resume('generate', { approved: true }, { runId, toolCallId });
			resumeCount++;

			if (resumeCount > 10) {
				throw new Error('Too many resume cycles — likely an infinite loop');
			}
		}

		// All tools should eventually be resolved
		expect(result.finishReason).toBe('stop');
		expect(result.pendingSuspend).toBeUndefined();
		expect(resumeCount).toBeGreaterThanOrEqual(2);
	});

	it('bounded concurrency suspends first batch and saves unexecuted tools, then resumes all (stream)', async () => {
		const agent = createAgentWithBatchedInterruptibleCalls('anthropic', 2);

		const { stream: fullStream } = await agent.stream(
			'Delete these three files: /tmp/a.txt, /tmp/b.txt, /tmp/c.txt. You MUST call delete_file for each file using parallel tool calls in the same turn. After deleting, tell me if you succeeded.',
		);

		const chunks = await collectStreamChunks(fullStream);
		let pendingSuspensions = chunksOfType(chunks, 'tool-call-suspended') as Array<
			StreamChunk & { type: 'tool-call-suspended' }
		>;

		expect(pendingSuspensions.length).toBe(2);

		let resumeCount = 0;

		while (pendingSuspensions.length > 0) {
			const next = pendingSuspensions[0];
			const resumedStream = await agent.resume(
				'stream',
				{ approved: true },
				{ runId: next.runId!, toolCallId: next.toolCallId! },
			);

			const resumedChunks = await collectStreamChunks(resumedStream.stream);
			pendingSuspensions = chunksOfType(resumedChunks, 'tool-call-suspended') as Array<
				StreamChunk & { type: 'tool-call-suspended' }
			>;
			resumeCount++;

			if (pendingSuspensions.length === 0) {
				const errorChunks = resumedChunks.filter((c) => c.type === 'error');
				expect(errorChunks).toHaveLength(0);

				const finishChunks = chunksOfType(resumedChunks, 'finish');
				expect(finishChunks.length).toBeGreaterThan(0);
				expect(finishChunks[0].finishReason).not.toBe('error');
			}

			if (resumeCount > 10) {
				throw new Error('Too many resume cycles — likely an infinite loop');
			}
		}

		expect(resumeCount).toBeGreaterThanOrEqual(2);
	});
});
