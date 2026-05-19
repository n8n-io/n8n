/**
 * Upsert contract: after a HITL suspend/resume cycle backed by SqliteMemory,
 * the thread must contain exactly ONE assistant message with the tool-call
 * block (no duplicate rows), and that block must have state: 'resolved'.
 *
 * The upsert matters because on resume the runtime calls saveToMemory with
 * turnDelta() which includes the now-resolved assistant message restored from
 * the checkpoint. Without upsert-by-id, a second row would be inserted for
 * the same message, breaking the thread ordering contract.
 *
 * Note: messages with state:'pending' are transient and are NOT written to
 * memory during suspension — they only live in the checkpoint. Memory only
 * receives the final settled state after resume completes.
 */
import { afterEach, expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, createSqliteMemory, getModel } from './helpers';
import { Agent, filterLlmMessages, Memory, Tool } from '../../index';
import type { AgentDbMessage } from '../../index';
import type { ContentToolCall, Message } from '../../types/sdk/message';

const describe = describeIf('anthropic');

describe('tool-call upsert via suspend/resume (SqliteMemory)', () => {
	const cleanups: Array<() => void> = [];

	afterEach(() => {
		for (const fn of cleanups) fn();
		cleanups.length = 0;
	});

	function extractToolCallBlocks(messages: AgentDbMessage[]): ContentToolCall[] {
		return filterLlmMessages(messages).flatMap((m) =>
			m.content.filter((c): c is ContentToolCall => c.type === 'tool-call'),
		);
	}

	function buildInterruptibleAgent(memory: ReturnType<typeof createSqliteMemory>['memory']): Agent {
		const deleteTool = new Tool('delete_file')
			.description('Delete a file at the given path')
			.input(z.object({ path: z.string().describe('File path to delete') }))
			.output(z.object({ deleted: z.boolean(), path: z.string() }))
			.suspend(z.object({ message: z.string(), severity: z.string() }))
			.resume(z.object({ approved: z.boolean() }))
			.handler(async ({ path }, ctx) => {
				if (!ctx.resumeData) {
					return await ctx.suspend({ message: `Delete "${path}"?`, severity: 'destructive' });
				}
				if (!ctx.resumeData.approved) return { deleted: false, path };
				return { deleted: true, path };
			});

		return new Agent('upsert-test-agent')
			.model(getModel('anthropic'))
			.instructions(
				'You are a file manager. When asked to delete a file, use the delete_file tool. Be concise.',
			)
			.tool(deleteTool)
			.memory(new Memory().storage(memory))
			.checkpoint('memory');
	}

	it('after resume, thread has exactly one resolved tool-call block (no duplicate rows)', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const threadId = 'thread-upsert-resolved';
		const resourceId = 'res-1';
		const persistence = { threadId, resourceId };

		const agent = buildInterruptibleAgent(memory);

		// Turn 1: trigger the suspend — messages with pending tool-call are
		// stored in the checkpoint only, NOT in SqliteMemory yet.
		const suspendResult = await agent.generate('Please delete /tmp/foo.txt', {
			persistence,
		});

		expect(suspendResult.finishReason).toBe('tool-calls');
		expect(suspendResult.pendingSuspend).toBeDefined();
		const { runId, toolCallId } = suspendResult.pendingSuspend![0];

		// Before resume: no tool-call blocks in memory (pending stays in checkpoint)
		const msgsBefore = await memory.getMessages(threadId);
		const blocksBefore = extractToolCallBlocks(msgsBefore);
		expect(blocksBefore).toHaveLength(0);

		// Turn 2: resume with approval — on completion saveToMemory is called and
		// the assistant message (now resolved) is written for the first time.
		const resumeResult = await agent.resume(
			'generate',
			{ approved: true },
			{
				runId,
				toolCallId,
			},
		);

		expect(resumeResult.finishReason).toBe('stop');

		// After resume: exactly one resolved tool-call block, no duplicate rows
		const msgsAfter = await memory.getMessages(threadId);
		const blocksAfter = extractToolCallBlocks(msgsAfter);

		expect(blocksAfter).toHaveLength(1);
		expect(blocksAfter[0].state).toBe('resolved');
		expect(blocksAfter[0].toolCallId).toBe(toolCallId);
		expect((blocksAfter[0] as ContentToolCall & { state: 'resolved' }).output).toMatchObject({
			deleted: true,
		});

		// No duplicate assistant messages with tool-call blocks
		const assistantMsgsWithToolCalls = filterLlmMessages(msgsAfter).filter(
			(m) => m.role === 'assistant' && m.content.some((c) => c.type === 'tool-call'),
		);
		expect(assistantMsgsWithToolCalls).toHaveLength(1);
	});

	it('after resume with denial, thread has exactly one resolved tool-call block', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const threadId = 'thread-upsert-denied';
		const resourceId = 'res-2';
		const persistence = { threadId, resourceId };

		const agent = buildInterruptibleAgent(memory);

		const suspendResult = await agent.generate('Please delete /tmp/bar.txt', {
			persistence,
		});
		expect(suspendResult.finishReason).toBe('tool-calls');
		const { runId, toolCallId } = suspendResult.pendingSuspend![0];

		// Before resume: no messages in memory
		const msgsBefore = await memory.getMessages(threadId);
		expect(extractToolCallBlocks(msgsBefore)).toHaveLength(0);

		const resumeResult = await agent.resume(
			'generate',
			{ approved: false },
			{
				runId,
				toolCallId,
			},
		);
		expect(resumeResult.finishReason).toBe('stop');

		const msgsAfter = await memory.getMessages(threadId);
		const blocksAfter = extractToolCallBlocks(msgsAfter);

		// Tool ran and returned {deleted: false} — still resolved, not rejected
		expect(blocksAfter).toHaveLength(1);
		expect(blocksAfter[0].state).toBe('resolved');
		const output = (blocksAfter[0] as ContentToolCall & { state: 'resolved' }).output;
		expect(output).toMatchObject({ deleted: false });

		// No duplicate rows
		const assistantMsgsWithToolCalls = filterLlmMessages(msgsAfter).filter(
			(m) => m.role === 'assistant' && m.content.some((c) => c.type === 'tool-call'),
		);
		expect(assistantMsgsWithToolCalls).toHaveLength(1);
	});

	it('if same thread is resumed twice (re-suspend then resume again), still no duplicate rows', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const threadId = 'thread-upsert-double';
		const resourceId = 'res-3';
		const persistence = { threadId, resourceId };

		// Use a tool that always re-suspends on first call and approves on second
		let callCount = 0;
		const confirmTool = new Tool('confirm')
			.description('Confirm an action')
			.input(z.object({ action: z.string() }))
			.output(z.object({ done: z.boolean() }))
			.suspend(z.object({ question: z.string() }))
			.resume(z.object({ yes: z.boolean() }))
			.handler(async ({ action }, ctx) => {
				callCount++;
				if (!ctx.resumeData) {
					return await ctx.suspend({ question: `Confirm: ${action}?` });
				}
				return { done: ctx.resumeData.yes };
			});

		const agent = new Agent('double-upsert-agent')
			.model(getModel('anthropic'))
			.instructions('Use confirm tool for every action. Be concise.')
			.tool(confirmTool)
			.memory(new Memory().storage(memory))
			.checkpoint('memory');

		// Turn 1: suspend
		const r1 = await agent.generate('confirm action: foo', { persistence });
		expect(r1.finishReason).toBe('tool-calls');
		const { runId, toolCallId } = r1.pendingSuspend![0];

		// No messages in memory yet
		expect(await memory.getMessages(threadId)).toHaveLength(0);

		// Resume: completes
		const r2 = await agent.resume('generate', { yes: true }, { runId, toolCallId });
		expect(r2.finishReason).toBe('stop');

		const finalMessages = await memory.getMessages(threadId);
		const toolCallBlocks = extractToolCallBlocks(finalMessages);

		// Exactly one tool-call block, no duplicates
		expect(toolCallBlocks).toHaveLength(1);
		expect(toolCallBlocks[0].state).toBe('resolved');

		// And the assistant message with the tool-call appears exactly once
		const assistantMsgsWithCalls = filterLlmMessages(finalMessages).filter(
			(m): m is Message => m.role === 'assistant' && m.content.some((c) => c.type === 'tool-call'),
		);
		expect(assistantMsgsWithCalls).toHaveLength(1);
	});
});
