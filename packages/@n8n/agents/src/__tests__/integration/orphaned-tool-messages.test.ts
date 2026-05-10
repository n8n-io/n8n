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
	 * Seed memory with a conversation that has settled tool-call blocks
	 * (state: 'resolved') surrounded by plain user/assistant exchanges.
	 *
	 * Message layout (indices 0–5):
	 *   0: user      "How many widgets?"
	 *   1: assistant  text + tool-call(call_1, state:'resolved', output:{count:10})
	 *   2: assistant  "There are 10 widgets"
	 *   3: user      "What about gadgets?"
	 *   4: assistant  text + tool-call(call_2, state:'resolved', output:{count:5})
	 *   5: assistant  "There are 5 gadgets"
	 */
	function buildSeedMessages(): AgentDbMessage[] {
		const now = Date.now();
		return [
			{
				id: 'm1',
				createdAt: new Date(now),
				role: 'user',
				content: [{ type: 'text', text: 'How many widgets do we have?' }],
			},
			{
				id: 'm2',
				createdAt: new Date(now + 1),
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Let me look that up.' },
					{
						type: 'tool-call',
						toolCallId: 'call_1',
						toolName: 'lookup',
						input: { id: 'widgets' },
						state: 'resolved',
						output: { count: 10 },
					},
				],
			},
			{
				id: 'm3',
				createdAt: new Date(now + 2),
				role: 'assistant',
				content: [{ type: 'text', text: 'There are 10 widgets in stock.' }],
			},
			{
				id: 'm4',
				createdAt: new Date(now + 3),
				role: 'user',
				content: [{ type: 'text', text: 'What about gadgets?' }],
			},
			{
				id: 'm5',
				createdAt: new Date(now + 4),
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Let me check.' },
					{
						type: 'tool-call',
						toolCallId: 'call_2',
						toolName: 'lookup',
						input: { id: 'gadgets' },
						state: 'resolved',
						output: { count: 5 },
					},
				],
			},
			{
				id: 'm6',
				createdAt: new Date(now + 5),
				role: 'assistant',
				content: [{ type: 'text', text: 'There are 5 gadgets in stock.' }],
			},
		];
	}

	it('handles partial history window when earlier messages are truncated', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const threadId = 'thread-orphan-result';

		// Seed 6 messages into the thread
		await memory.saveMessages({ threadId, messages: buildSeedMessages() });

		// lastMessages=4 → loads messages 2–5
		// Each tool-call block carries its own result (state:'resolved'), so there
		// are no orphan issues regardless of window boundaries.
		const mem = new Memory().storage(memory).lastMessages(4);

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

	it('handles pending tool-call blocks (interrupted turn) in history', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const threadId = 'thread-orphan-call';
		const now = Date.now();

		// Store a conversation where the last saved message is an assistant
		// with a pending tool-call block (simulating a partial save / interrupted turn).
		// stripOrphanedToolMessages will drop the pending block so the LLM receives
		// only the user message.
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
						state: 'pending',
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
