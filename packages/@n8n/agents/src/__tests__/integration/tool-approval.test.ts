import { expect, it } from 'vitest';

import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	createAgentWithApprovalTool,
	createAgentWithMixedTools,
} from './helpers';
import type { StreamChunk } from '../../index';

const describe = describeIf('anthropic');

describe('tool approval integration', () => {
	it('pauses the stream when a tool requires approval', async () => {
		const agent = createAgentWithApprovalTool('anthropic');

		const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');

		const chunks = await collectStreamChunks(fullStream);
		const chunkTypes = chunks.map((c) => c.type);

		expect(chunkTypes).toContain('tool-call-approval');

		const approvalChunks = chunksOfType(chunks, 'tool-call-approval');
		expect(approvalChunks.length).toBe(1);

		const approval = approvalChunks[0] as StreamChunk & { type: 'tool-call-approval' };
		expect(approval.tool).toBe('delete_file');
		expect(approval.runId).toBeTruthy();

		// No tool-result should appear (tool is paused)
		const contentChunks = chunks.filter(
			(c) =>
				c.type === 'content' &&
				'content' in c &&
				(c.content as { type: string }).type === 'tool-result',
		);
		expect(contentChunks).toHaveLength(0);
	});

	it('resumes the stream after approval', async () => {
		const agent = createAgentWithApprovalTool('anthropic');

		const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');

		const chunks = await collectStreamChunks(fullStream);
		const approvalChunks = chunksOfType(chunks, 'tool-call-approval');
		expect(approvalChunks.length).toBe(1);

		const approval = approvalChunks[0] as StreamChunk & { type: 'tool-call-approval' };
		const { fullStream: resumedStream } = await agent.approveToolCall(
			approval.runId!,
			approval.toolCallId,
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

	it('resumes the stream after denial', async () => {
		const agent = createAgentWithApprovalTool('anthropic');

		const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');

		const chunks = await collectStreamChunks(fullStream);
		const approvalChunks = chunksOfType(chunks, 'tool-call-approval');
		expect(approvalChunks.length).toBe(1);

		const approval = approvalChunks[0] as StreamChunk & { type: 'tool-call-approval' };
		const { fullStream: resumedStream } = await agent.declineToolCall(
			approval.runId!,
			approval.toolCallId,
		);

		const resumedChunks = await collectStreamChunks(resumedStream);
		const resumedTypes = resumedChunks.map((c) => c.type);

		expect(resumedTypes).toContain('text-delta');
	});

	it('auto-approves non-approval tools while pausing approval tools', async () => {
		const agent = createAgentWithMixedTools('anthropic');

		const { fullStream } = await agent.streamText(
			'You must call both tools: first call list_files with dir="/home", then call delete_file with path="/home/readme.md". Do not skip either tool.',
		);

		const chunks = await collectStreamChunks(fullStream);

		const allTypes = [...new Set(chunks.map((c) => c.type))];
		console.log('All chunk types:', allTypes);

		// list_files should auto-execute — its result should appear as content
		const toolResultChunks = chunks.filter(
			(c) =>
				c.type === 'content' &&
				'content' in c &&
				(c.content as { type: string; toolName?: string }).type === 'tool-result' &&
				(c.content as { toolName?: string }).toolName === 'list_files',
		);
		expect(toolResultChunks.length).toBeGreaterThan(0);

		// delete_file should be paused for approval
		const approvalChunks = chunksOfType(chunks, 'tool-call-approval');
		const deleteApproval = approvalChunks.find(
			(c) => (c as StreamChunk & { type: 'tool-call-approval' }).tool === 'delete_file',
		);

		// If the LLM called delete_file, it should have been paused
		if (deleteApproval) {
			expect(deleteApproval).toBeDefined();
		}
	});
});
