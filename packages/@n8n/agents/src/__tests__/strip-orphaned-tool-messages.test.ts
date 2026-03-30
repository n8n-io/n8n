import { stripOrphanedToolMessages } from '../runtime/strip-orphaned-tool-messages';
import { isLlmMessage, toDbMessage } from '../sdk/message';
import type { AgentDbMessage, AgentMessage, Message } from '../types/sdk/message';

function seed(messages: AgentMessage[]): AgentDbMessage[] {
	return messages.map(toDbMessage);
}

describe('stripOrphanedToolMessages', () => {
	it('returns messages unchanged when all tool pairs are complete', () => {
		const messages = seed([
			{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Looking up...' },
					{ type: 'tool-call', toolCallId: 'c1', toolName: 'lookup', input: {} },
				],
			},
			{
				role: 'tool',
				content: [{ type: 'tool-result', toolCallId: 'c1', toolName: 'lookup', result: 42 }],
			},
			{ role: 'assistant', content: [{ type: 'text', text: 'Done.' }] },
		]);

		const result = stripOrphanedToolMessages(messages);
		expect(result).toBe(messages);
	});

	it('strips orphaned tool-result when matching tool-call is missing', () => {
		const messages = seed([
			{
				role: 'tool',
				content: [{ type: 'tool-result', toolCallId: 'c1', toolName: 'lookup', result: 42 }],
			},
			{ role: 'assistant', content: [{ type: 'text', text: 'There are 42.' }] },
			{ role: 'user', content: [{ type: 'text', text: 'Thanks' }] },
		]);

		const result = stripOrphanedToolMessages(messages).filter(isLlmMessage) as Message[];

		expect(result).toHaveLength(2);
		expect(result[0].role).toBe('assistant');
		expect(result[1].role).toBe('user');
	});

	it('strips orphaned tool-call when matching tool-result is missing', () => {
		const messages = seed([
			{ role: 'user', content: [{ type: 'text', text: 'Check it' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Checking...' },
					{ type: 'tool-call', toolCallId: 'c1', toolName: 'lookup', input: {} },
				],
			},
		]);

		const result = stripOrphanedToolMessages(messages).filter(isLlmMessage) as Message[];

		expect(result).toHaveLength(2);
		const assistantMsg = result[1];
		expect(assistantMsg.role).toBe('assistant');
		expect(assistantMsg.content).toHaveLength(1);
		expect(assistantMsg.content[0].type).toBe('text');
	});

	it('drops assistant message entirely if it only contained an orphaned tool-call', () => {
		const messages = seed([
			{ role: 'user', content: [{ type: 'text', text: 'Do it' }] },
			{
				role: 'assistant',
				content: [{ type: 'tool-call', toolCallId: 'c1', toolName: 'action', input: {} }],
			},
		]);

		const result = stripOrphanedToolMessages(messages).filter(isLlmMessage) as Message[];

		expect(result).toHaveLength(1);
		expect(result[0].role).toBe('user');
	});

	it('handles mixed scenario: one complete pair and one orphaned result', () => {
		const messages = seed([
			{
				role: 'tool',
				content: [
					{ type: 'tool-result', toolCallId: 'orphan', toolName: 'lookup', result: 'stale' },
				],
			},
			{ role: 'assistant', content: [{ type: 'text', text: 'Old result' }] },
			{ role: 'user', content: [{ type: 'text', text: 'New question' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Looking up...' },
					{ type: 'tool-call', toolCallId: 'c2', toolName: 'lookup', input: {} },
				],
			},
			{
				role: 'tool',
				content: [{ type: 'tool-result', toolCallId: 'c2', toolName: 'lookup', result: 99 }],
			},
			{ role: 'assistant', content: [{ type: 'text', text: '99 items' }] },
		]);

		const result = stripOrphanedToolMessages(messages).filter(isLlmMessage) as Message[];

		expect(result).toHaveLength(5);
		expect(result[0].role).toBe('assistant');
		expect(result[0].content[0]).toEqual(
			expect.objectContaining({ type: 'text', text: 'Old result' }),
		);

		const toolCallMsg = result.find(
			(m) => m.role === 'assistant' && m.content.some((c) => c.type === 'tool-call'),
		);
		expect(toolCallMsg).toBeDefined();
		const toolResultMsg = result.find((m) => m.role === 'tool');
		expect(toolResultMsg).toBeDefined();
	});

	it('preserves custom (non-LLM) messages', () => {
		const customMsg: AgentDbMessage = {
			id: 'custom-1',
			type: 'custom',
			messageType: 'notification',
			data: { info: 'hello' },
		} as unknown as AgentDbMessage;

		const messages: AgentDbMessage[] = [
			customMsg,
			...seed([
				{
					role: 'tool',
					content: [{ type: 'tool-result', toolCallId: 'orphan', toolName: 'x', result: null }],
				},
			]),
		];

		const result = stripOrphanedToolMessages(messages);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe(customMsg);
	});

	it('returns same array reference when no orphans exist (no-op fast path)', () => {
		const messages = seed([
			{ role: 'user', content: [{ type: 'text', text: 'Hi' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'Hello!' }] },
		]);

		const result = stripOrphanedToolMessages(messages);
		expect(result).toBe(messages);
	});
});
