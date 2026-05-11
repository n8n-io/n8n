import { stripOrphanedToolMessages } from '../runtime/strip-orphaned-tool-messages';
import type { AgentMessage, Message } from '../types/sdk/message';

describe('stripOrphanedToolMessages', () => {
	it('returns messages unchanged when all tool-calls are settled', () => {
		const messages: AgentMessage[] = [
			{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Looking up...' },
					{
						type: 'tool-call',
						toolCallId: 'c1',
						toolName: 'lookup',
						input: {},
						state: 'resolved',
						output: 42,
					},
				],
			},
			{ role: 'assistant', content: [{ type: 'text', text: 'Done.' }] },
		];

		const result = stripOrphanedToolMessages(messages);
		expect(result).toEqual(messages);
	});

	it('drops pending tool-call blocks while preserving sibling content', () => {
		const messages: AgentMessage[] = [
			{ role: 'user', content: [{ type: 'text', text: 'Check it' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Checking...' },
					{ type: 'tool-call', toolCallId: 'c1', toolName: 'lookup', input: {}, state: 'pending' },
				],
			},
		];

		const result = stripOrphanedToolMessages(messages) as Message[];

		expect(result).toHaveLength(2);
		const assistantMsg = result[1];
		expect(assistantMsg.role).toBe('assistant');
		expect(assistantMsg.content).toHaveLength(1);
		expect(assistantMsg.content[0].type).toBe('text');
	});

	it('drops empty messages after pending strip', () => {
		const messages: AgentMessage[] = [
			{ role: 'user', content: [{ type: 'text', text: 'Do it' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'tool-call', toolCallId: 'c1', toolName: 'action', input: {}, state: 'pending' },
				],
			},
		];

		const result = stripOrphanedToolMessages(messages) as Message[];

		expect(result).toHaveLength(1);
		expect(result[0].role).toBe('user');
	});

	it('mixed scenario — only pending blocks are removed', () => {
		const messages: AgentMessage[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'c1',
						toolName: 'lookup',
						input: {},
						state: 'resolved',
						output: 99,
					},
					{
						type: 'tool-call',
						toolCallId: 'c2',
						toolName: 'delete',
						input: {},
						state: 'pending',
					},
					{
						type: 'tool-call',
						toolCallId: 'c3',
						toolName: 'create',
						input: {},
						state: 'rejected',
						error: 'boom',
					},
				],
			},
		];

		const result = stripOrphanedToolMessages(messages) as Message[];

		expect(result).toHaveLength(1);
		const blocks = result[0].content;
		// c2 (pending) should be removed; c1 (resolved) and c3 (rejected) stay
		expect(blocks).toHaveLength(2);
		expect(blocks.map((b) => (b as { toolCallId: string }).toolCallId)).toEqual(['c1', 'c3']);
	});

	it('preserves custom (non-LLM) messages', () => {
		const customMsg: AgentMessage = {
			id: 'custom-1',
			type: 'custom',
			messageType: 'notification',
			data: { info: 'hello' },
		} as unknown as AgentMessage;

		const messages: AgentMessage[] = [
			customMsg,
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'c1',
						toolName: 'x',
						input: {},
						state: 'pending',
					},
				],
			},
		];

		const result = stripOrphanedToolMessages(messages);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe(customMsg);
	});
});
