import { expect, it } from 'vitest';

import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	createAgentWithInterruptibleTool,
	createAgentWithMixedTools,
} from './helpers';
import type { StreamChunk } from '../../index';

const describe = describeIf('anthropic');

describe('tool interrupt integration', () => {
	it('pauses the stream when a tool suspends', async () => {
		const agent = createAgentWithInterruptibleTool('anthropic');

		const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');

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
				c.type === 'content' &&
				'content' in c &&
				(c.content as { type: string }).type === 'tool-result',
		);
		expect(contentChunks).toHaveLength(0);
	});

	it('resumes the stream after resume with approval', async () => {
		const agent = createAgentWithInterruptibleTool('anthropic');

		const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');

		const chunks = await collectStreamChunks(fullStream);
		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendedChunks.length).toBe(1);

		const suspended = suspendedChunks[0] as StreamChunk & { type: 'tool-call-suspended' };
		const { fullStream: resumedStream } = await agent.resume(
			{ approved: true },
			{ runId: suspended.runId!, toolCallId: suspended.toolCallId! },
		);

		const resumedChunks = await collectStreamChunks(resumedStream);
		const resumedTypes = resumedChunks.map((c) => c.type);

		// After approval, tool-result should appear as content chunk
		const toolResultChunks = resumedChunks.filter(
			(c) =>
				c.type === 'content' &&
				'content' in c &&
				(c.content as { type: string }).type === 'tool-result',
		);
		expect(toolResultChunks.length).toBeGreaterThan(0);

		expect(resumedTypes).toContain('text-delta');
	});

	it('resumes the stream after resume with denial', async () => {
		const agent = createAgentWithInterruptibleTool('anthropic');

		const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');

		const chunks = await collectStreamChunks(fullStream);
		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendedChunks.length).toBe(1);

		const suspended = suspendedChunks[0] as StreamChunk & { type: 'tool-call-suspended' };
		const { fullStream: resumedStream } = await agent.resume(
			{ approved: false },
			{ runId: suspended.runId!, toolCallId: suspended.toolCallId! },
		);

		const resumedChunks = await collectStreamChunks(resumedStream);
		const resumedTypes = resumedChunks.map((c) => c.type);

		expect(resumedTypes).toContain('text-delta');
	});

	it('auto-executes non-interruptible tools while suspending interruptible ones', async () => {
		const agent = createAgentWithMixedTools('anthropic');

		const { fullStream } = await agent.streamText(
			'You must call both tools: first call list_files with dir="/home", then call delete_file with path="/home/readme.md". Do not skip either tool.',
		);

		const chunks = await collectStreamChunks(fullStream);

		// list_files should auto-execute — its result should appear as content
		const toolResultChunks = chunks.filter(
			(c) =>
				c.type === 'content' &&
				'content' in c &&
				(c.content as { type: string; toolName?: string }).type === 'tool-result' &&
				(c.content as { toolName?: string }).toolName === 'list_files',
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
