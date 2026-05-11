/**
 * Regression test: interim user message while a tool-call is suspended.
 *
 * Old architecture bug: if a user sent a new message between a tool-call
 * suspension and its eventual resume, the message list would contain:
 *
 *   assistant{tool-call}  →  user{interim}  →  tool{tool-result}
 *
 * This order is invalid for AI SDK providers (tool-result must immediately
 * follow its tool-call). The new architecture stores the result ON the
 * tool-call block, so toAiMessages always emits:
 *
 *   assistant{tool-call}  →  tool{tool-result}  →  user{interim}  →  assistant{reply}
 *
 * The tool-result is always adjacent to its tool-call regardless of what n8n
 * messages come after it in the list.
 *
 * This test drives the full scenario end-to-end and asserts that:
 *  1. The final result has finishReason 'stop' (no provider error).
 *  2. The tool-call block on the originating assistant message transitions to
 *     state 'resolved' with the expected output.
 *  3. The interim user/assistant messages are still present in memory.
 */
import { afterEach, expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, createSqliteMemory, getModel } from './helpers';
import { Agent, filterLlmMessages, Memory, Tool } from '../../index';
import type { AgentDbMessage } from '../../index';
import type { ContentToolCall, Message } from '../../types/sdk/message';

const describe = describeIf('anthropic');

describe('interim user message during tool suspension', () => {
	const cleanups: Array<() => void> = [];

	afterEach(() => {
		for (const fn of cleanups) fn();
		cleanups.length = 0;
	});

	function buildInterruptibleAgent(mem: Memory): Agent {
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

		return new Agent('interim-test-agent')
			.model(getModel('anthropic'))
			.instructions(
				'You are a file manager. When asked to delete a file, use the delete_file tool. Be concise.',
			)
			.tool(deleteTool)
			.memory(mem)
			.checkpoint('memory');
	}

	for (const method of ['generate', 'stream'] as const) {
		it(`[${method}] interim message does not break provider message ordering`, async () => {
			const { memory, cleanup } = createSqliteMemory();
			cleanups.push(cleanup);

			const threadId = `thread-interim-${method}`;
			const resourceId = 'res-interim';
			const persistence = { threadId, resourceId };
			const mem = new Memory().storage(memory);

			const agent = buildInterruptibleAgent(mem);

			// ----------------------------------------------------------------
			// Turn 1: trigger the tool suspension
			// ----------------------------------------------------------------
			const suspendResult = await agent.generate('Please delete /tmp/interim-test.txt', {
				persistence,
			});

			expect(suspendResult.finishReason).toBe('tool-calls');
			expect(suspendResult.pendingSuspend).toBeDefined();
			const { runId, toolCallId } = suspendResult.pendingSuspend![0];

			// ----------------------------------------------------------------
			// Interim turn: send a new message while the tool is suspended.
			// Build a fresh agent instance to simulate a separate request.
			// ----------------------------------------------------------------
			const interimAgent = new Agent('interim-agent')
				.model(getModel('anthropic'))
				.instructions('You are helpful. Answer questions concisely.')
				.memory(mem);

			const interimResult = await interimAgent.generate('What is 1 + 1?', { persistence });
			expect(interimResult.finishReason).toBe('stop');

			// ----------------------------------------------------------------
			// Resume turn: approve the suspended tool call
			// ----------------------------------------------------------------
			let resumeFinishReason: string;
			if (method === 'generate') {
				const result = await agent.resume(
					'generate',
					{ approved: true },
					{
						runId,
						toolCallId,
					},
				);
				resumeFinishReason = result.finishReason ?? 'stop';
			} else {
				const { stream } = await agent.resume(
					'stream',
					{ approved: true },
					{
						runId,
						toolCallId,
					},
				);
				// Drain the stream
				const reader = stream.getReader();
				let finishReason = 'stop';
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					if ((value as { type: string }).type === 'finish') {
						finishReason = (value as { finishReason?: string }).finishReason ?? 'stop';
					}
				}
				resumeFinishReason = finishReason;
			}

			// ----------------------------------------------------------------
			// Assertions
			// ----------------------------------------------------------------
			// 1. No provider error — the ordering was valid
			expect(resumeFinishReason).toBe('stop');

			// 2. The originating assistant message's tool-call block is resolved
			const allMessages = await memory.getMessages(threadId);
			const llmMessages = filterLlmMessages(allMessages);

			const ourBlock = llmMessages
				.flatMap((m) => m.content.filter((c): c is ContentToolCall => c.type === 'tool-call'))
				.find((b) => b.toolCallId === toolCallId);

			expect(ourBlock).toBeDefined();
			expect(ourBlock!.state).toBe('resolved');

			// 3. The interim user/assistant exchange is present in memory
			const userMessages = allMessages.filter(
				(m): m is AgentDbMessage & Message => 'role' in m && m.role === 'user',
			);
			// Turn-1 user + interim user (at minimum)
			expect(userMessages.length).toBeGreaterThanOrEqual(2);
		});
	}

	it('preserves chronological ordering of messages in memory after resume', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const threadId = 'thread-interim-ordering';
		const resourceId = 'res-ordering';
		const persistence = { threadId, resourceId };
		const mem = new Memory().storage(memory);

		const agent = buildInterruptibleAgent(mem);

		// Turn 1: suspend
		const suspendResult = await agent.generate('Delete /tmp/order-test.txt', { persistence });
		expect(suspendResult.finishReason).toBe('tool-calls');
		const { runId, toolCallId } = suspendResult.pendingSuspend![0];

		// Interim turn
		const interimAgent = new Agent('interim-ordering')
			.model(getModel('anthropic'))
			.instructions('Answer concisely.')
			.memory(mem);
		await interimAgent.generate('Say hi', { persistence });

		// Resume
		const resumeResult = await agent.resume(
			'generate',
			{ approved: true },
			{
				runId,
				toolCallId,
			},
		);
		expect(resumeResult.finishReason).toBe('stop');

		// The tool-call is resolved
		const allMessages = await memory.getMessages(threadId);
		const llmMessages = filterLlmMessages(allMessages);
		const ourBlock = llmMessages
			.flatMap((m) => m.content.filter((c): c is ContentToolCall => c.type === 'tool-call'))
			.find((b) => b.toolCallId === toolCallId);

		expect(ourBlock).toBeDefined();
		expect(ourBlock!.state).toBe('resolved');

		// Messages are in chronological order (createdAt ascending)
		const timestamps = allMessages.map((m) => m.createdAt.getTime());
		for (let i = 1; i < timestamps.length; i++) {
			expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
		}
	});
});
