import type { AgentMessage, ContentToolCall, Message } from '../../types/sdk/message';
import {
	settleOrphanedToolMessages,
	stripOrphanedToolMessages,
} from '../memory/strip-orphaned-tool-messages';

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

describe('settleOrphanedToolMessages', () => {
	const settledBlock = (result: AgentMessage[], msgIndex: number, blockIndex: number) =>
		(result[msgIndex] as Message).content[blockIndex] as ContentToolCall;

	it('returns messages unchanged when all tool-calls are settled', () => {
		const messages: AgentMessage[] = [
			{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
			{
				role: 'assistant',
				content: [
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
		];

		const result = settleOrphanedToolMessages(messages);
		expect(result).toEqual(messages);
		// Untouched messages are passed through by reference, not rebuilt.
		expect(result[1]).toBe(messages[1]);
	});

	it('rejects a pending block with a "did not take effect" record instead of dropping it', () => {
		const messages: AgentMessage[] = [
			{ role: 'user', content: [{ type: 'text', text: 'Save it' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Saving...' },
					{
						type: 'tool-call',
						toolCallId: 'c1',
						toolName: 'build-workflow',
						input: { workflowId: 'wf1' },
						state: 'pending',
					},
				],
			},
		];

		const result = settleOrphanedToolMessages(messages);

		expect(result).toHaveLength(2);
		const msg = result[1] as Message;
		expect(msg.content).toHaveLength(2);
		const block = settledBlock(result, 1, 1);
		expect(block.state).toBe('rejected');
		expect(block.toolCallId).toBe('c1');
		expect(block.input).toEqual({ workflowId: 'wf1' });
		const error = (block as Extract<ContentToolCall, { state: 'rejected' }>).error;
		expect(error).toContain('build-workflow call never completed');
		expect(error).toContain('did NOT take effect');
	});

	it('quotes the confirmation message when the pending block carries suspension info', () => {
		const messages: AgentMessage[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'c1',
						toolName: 'build-workflow',
						input: {},
						state: 'pending',
						suspension: { message: 'Edit My Workflow (ID: abc123)?', requestId: 'req1' },
					},
				],
			},
		];

		const result = settleOrphanedToolMessages(messages);

		const block = settledBlock(result, 0, 0);
		expect(block.state).toBe('rejected');
		const error = (block as Extract<ContentToolCall, { state: 'rejected' }>).error;
		expect(error).toContain('Edit My Workflow (ID: abc123)?');
		expect(error).toContain('never answered');
		// The suspension marker is consumed into the error, not carried on the settled block.
		expect('suspension' in block).toBe(false);
	});

	it('keeps a message whose only content is a pending block (unlike strip)', () => {
		const messages: AgentMessage[] = [
			{ role: 'user', content: [{ type: 'text', text: 'Do it' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'tool-call', toolCallId: 'c1', toolName: 'action', input: {}, state: 'pending' },
				],
			},
		];

		const result = settleOrphanedToolMessages(messages);

		expect(result).toHaveLength(2);
		expect(settledBlock(result, 1, 0).state).toBe('rejected');
	});

	it('drops a pending provider-executed tool call without fabricating a result', () => {
		const messages: AgentMessage[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'srvtoolu-1',
						toolName: 'anthropic.web_search_20250305',
						input: { query: 'n8n' },
						providerExecuted: true,
						state: 'pending',
					},
					{ type: 'text', text: 'I found n8n.' },
				],
			},
		];

		const result = settleOrphanedToolMessages(messages);

		expect(result).toEqual([
			{ role: 'assistant', content: [{ type: 'text', text: 'I found n8n.' }] },
		]);
	});

	it('drops the whole message when its only block is a pending provider-executed call', () => {
		const user: AgentMessage = { role: 'user', content: [{ type: 'text', text: 'Search' }] };
		const messages: AgentMessage[] = [
			user,
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'srvtoolu-1',
						toolName: 'anthropic.web_search_20250305',
						input: { query: 'n8n' },
						providerExecuted: true,
						state: 'pending',
					},
				],
			},
		];

		expect(settleOrphanedToolMessages(messages)).toEqual([user]);
	});

	it('settles only pending blocks in a mixed message', () => {
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

		const result = settleOrphanedToolMessages(messages);

		const blocks = (result[0] as Message).content as ContentToolCall[];
		expect(blocks).toHaveLength(3);
		expect(blocks[0].state).toBe('resolved');
		expect(blocks[1].state).toBe('rejected');
		expect((blocks[1] as Extract<ContentToolCall, { state: 'rejected' }>).error).toContain(
			'never completed',
		);
		expect(blocks[2].state).toBe('rejected');
		expect((blocks[2] as Extract<ContentToolCall, { state: 'rejected' }>).error).toBe('boom');
	});

	it('preserves custom (non-LLM) messages by reference', () => {
		const customMsg: AgentMessage = {
			id: 'custom-1',
			type: 'custom',
			messageType: 'notification',
			data: { info: 'hello' },
		} as unknown as AgentMessage;

		const result = settleOrphanedToolMessages([customMsg]);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe(customMsg);
	});
});
