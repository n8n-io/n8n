import { expect, it } from 'vitest';

import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	createAgentWithApprovalTool,
	createAgentWithMixedTools,
} from './helpers';

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
		expect(approvalChunks[0].payload?.toolName).toBe('delete_file');
		expect(approvalChunks[0].runId).toBeTruthy();

		expect(chunkTypes).not.toContain('tool-result');
	});

	it('resumes the stream after approval', async () => {
		const agent = createAgentWithApprovalTool('anthropic');

		const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');

		const chunks = await collectStreamChunks(fullStream);
		const approvalChunks = chunksOfType(chunks, 'tool-call-approval');
		expect(approvalChunks.length).toBe(1);

		const { runId } = approvalChunks[0];
		const toolCallId = approvalChunks[0].payload?.toolCallId;

		const { fullStream: resumedStream } = await agent.approveToolCall(runId!, toolCallId);

		const resumedChunks = await collectStreamChunks(resumedStream);
		const resumedTypes = resumedChunks.map((c) => c.type);

		expect(resumedTypes).toContain('tool-result');

		const resultChunks = chunksOfType(resumedChunks, 'tool-result');
		expect(resultChunks[0].payload?.toolName).toBe('delete_file');

		expect(resumedTypes).toContain('text-delta');
	});

	it('resumes the stream after denial', async () => {
		const agent = createAgentWithApprovalTool('anthropic');

		const { fullStream } = await agent.streamText('Delete the file /tmp/test.txt');

		const chunks = await collectStreamChunks(fullStream);
		const approvalChunks = chunksOfType(chunks, 'tool-call-approval');
		expect(approvalChunks.length).toBe(1);

		const { runId } = approvalChunks[0];
		const toolCallId = approvalChunks[0].payload?.toolCallId;

		const { fullStream: resumedStream } = await agent.declineToolCall(runId!, toolCallId);

		const resumedChunks = await collectStreamChunks(resumedStream);
		const resumedTypes = resumedChunks.map((c) => c.type);

		expect(resumedTypes).toContain('text-delta');

		// Note: Mastra may still emit a tool-result on denial — the key
		// assertion is that the stream resumes with text acknowledging the denial.
	});

	it('auto-approves non-approval tools while pausing approval tools', async () => {
		const agent = createAgentWithMixedTools('anthropic');

		const { fullStream } = await agent.streamText(
			'You must call both tools: first call list_files with dir="/home", then call delete_file with path="/home/readme.md". Do not skip either tool.',
		);

		const chunks = await collectStreamChunks(fullStream);

		const allTypes = chunks.map((c) => c.type);
		console.log('All chunk types:', [...new Set(allTypes)]);

		const toolResults = chunksOfType(chunks, 'tool-result');
		const listResult = toolResults.find((c) => c.payload?.toolName === 'list_files');

		// list_files should auto-execute (no approval needed)
		expect(listResult).toBeDefined();

		// delete_file should be paused for approval OR auto-approved then paused
		// depending on how Mastra sequences the calls
		const approvalChunks = chunksOfType(chunks, 'tool-call-approval');
		const deleteApproval = approvalChunks.find((c) => c.payload?.toolName === 'delete_file');

		// If the LLM called delete_file, it should have been paused
		const deleteToolCall = chunksOfType(chunks, 'tool-call').find(
			(c) => c.payload?.toolName === 'delete_file',
		);
		if (deleteToolCall) {
			expect(deleteApproval).toBeDefined();
		}
	});
});
