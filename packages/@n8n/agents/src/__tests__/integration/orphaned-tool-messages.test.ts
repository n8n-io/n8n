import { expect, it, afterEach } from 'vitest';
import { z } from 'zod';

import { describeIf, getModel, createSqliteMemory } from './helpers';
import { Agent, Memory, Tool } from '../../index';
import type { AgentDbMessage } from '../../index';

const describe = describeIf('anthropic');

describe('orphaned tool messages in memory', () => {
	const cleanups: Array<() => void> = [];

	afterEach(() => {
		for (const fn of cleanups) fn();
		cleanups.length = 0;
	});

	/**
	 * Build a dummy tool so the agent has a valid tool schema.
	 * The tool itself should never be called in these tests.
	 */
	function buildLookupTool() {
		return new Tool('lookup')
			.description('Look up data by id')
			.input(z.object({ id: z.string() }))
			.output(z.object({ count: z.number() }))
			.handler(async () => ({ count: 99 }));
	}

	/**
	 * Seed memory with a conversation that has tool-call / tool-result pairs
	 * surrounded by plain user/assistant exchanges.
	 *
	 * Message layout (indices 0–7):
	 *   0: user   "How many widgets?"
	 *   1: assistant  text + tool-call(call_1)
	 *   2: tool   tool-result(call_1)
	 *   3: assistant  "There are 10 widgets"
	 *   4: user   "What about gadgets?"
	 *   5: assistant  text + tool-call(call_2)
	 *   6: tool   tool-result(call_2)
	 *   7: assistant  "There are 5 gadgets"
	 */
	function buildSeedMessages(): AgentDbMessage[] {
		return [
			{
				id: 'm1',
				createdAt: new Date(),
				role: 'user',
				content: [{ type: 'text', text: 'How many widgets do we have?' }],
			},
			{
				id: 'm2',
				createdAt: new Date(),
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Let me look that up.' },
					{ type: 'tool-call', toolCallId: 'call_1', toolName: 'lookup', input: { id: 'widgets' } },
				],
			},
			{
				id: 'm3',
				createdAt: new Date(),
				role: 'tool',
				content: [
					{ type: 'tool-result', toolCallId: 'call_1', toolName: 'lookup', result: { count: 10 } },
				],
			},
			{
				id: 'm4',
				createdAt: new Date(),
				role: 'assistant',
				content: [{ type: 'text', text: 'There are 10 widgets in stock.' }],
			},
			{
				id: 'm5',
				createdAt: new Date(),
				role: 'user',
				content: [{ type: 'text', text: 'What about gadgets?' }],
			},
			{
				id: 'm6',
				createdAt: new Date(),
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Let me check.' },
					{ type: 'tool-call', toolCallId: 'call_2', toolName: 'lookup', input: { id: 'gadgets' } },
				],
			},
			{
				id: 'm7',
				createdAt: new Date(),
				role: 'tool',
				content: [
					{ type: 'tool-result', toolCallId: 'call_2', toolName: 'lookup', result: { count: 5 } },
				],
			},
			{
				id: 'm8',
				createdAt: new Date(),
				role: 'assistant',
				content: [{ type: 'text', text: 'There are 5 gadgets in stock.' }],
			},
		];
	}

	it('handles orphaned tool results when tool-call message is truncated from history', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const threadId = 'thread-orphan-result';

		// Seed 8 messages into the thread
		await memory.saveMessages({ threadId, messages: buildSeedMessages() });

		// lastMessages=6 → loads messages 2–7
		// Message at index 2 is a tool-result for call_1, but the matching
		// assistant+tool-call (index 1) is truncated. This is an orphaned tool result.
		const mem = new Memory().storage(memory).lastMessages(6);

		const agent = new Agent('orphan-result-test')
			.model(getModel('anthropic'))
			.instructions('You are an inventory assistant. Use lookup to check stock. Be concise.')
			.tool(buildLookupTool())
			.memory(mem);

		// This should NOT throw even though history contains an orphaned tool-result
		const result = await agent.generate('Can you summarize what we discussed?', {
			persistence: { threadId, resourceId: 'test' },
		});

		expect(result.finishReason).toBe('stop');
	});

	it('handles orphaned tool calls when tool-result message is truncated from history', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const threadId = 'thread-orphan-call';
		const now = Date.now();

		// Store a conversation where the last saved message is an assistant
		// with a tool-call but the tool-result was never persisted (simulating
		// a partial save / interrupted turn).
		const messages: AgentDbMessage[] = [
			{
				id: 'm1',
				createdAt: new Date(now),
				role: 'user',
				content: [{ type: 'text', text: 'How many widgets?' }],
			},
			{
				id: 'm2',
				createdAt: new Date(now + 1),
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Checking inventory.' },
					{
						type: 'tool-call',
						toolCallId: 'call_orphan',
						toolName: 'lookup',
						input: { id: 'widgets' },
					},
				],
			},
		];

		await memory.saveMessages({ threadId, messages });

		const mem = new Memory().storage(memory).lastMessages(10);

		const agent = new Agent('orphan-call-test')
			.model(getModel('anthropic'))
			.instructions('You are an inventory assistant. Use lookup to check stock. Be concise.')
			.tool(buildLookupTool())
			.memory(mem);

		// This should NOT throw even though history has a tool-call with no result
		const result = await agent.generate('Actually, never mind. How are you?', {
			persistence: { threadId, resourceId: 'test' },
		});

		expect(result.finishReason).toBe('stop');
	});
});
