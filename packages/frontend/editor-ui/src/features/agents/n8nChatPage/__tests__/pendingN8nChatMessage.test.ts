import { stashPendingN8nChatMessage, consumePendingN8nChatMessage } from '../pendingN8nChatMessage';

describe('pendingN8nChatMessage', () => {
	it('returns the stored message for a matching agent id', () => {
		const file = new File(['a'], 'a.txt');
		stashPendingN8nChatMessage({ agentId: 'agent-1', text: 'hello', files: [file] });

		expect(consumePendingN8nChatMessage('agent-1')).toEqual({
			agentId: 'agent-1',
			text: 'hello',
			files: [file],
		});
	});

	it('returns undefined and clears the entry for a different agent id', () => {
		stashPendingN8nChatMessage({ agentId: 'agent-1', text: 'hello', files: [] });

		expect(consumePendingN8nChatMessage('agent-2')).toBeUndefined();
		// The mismatched read already cleared it, so even the original agent gets nothing.
		expect(consumePendingN8nChatMessage('agent-1')).toBeUndefined();
	});

	it('is one-shot: a second take for the same agent returns undefined', () => {
		stashPendingN8nChatMessage({ agentId: 'agent-1', text: 'hello', files: [] });

		expect(consumePendingN8nChatMessage('agent-1')).toBeDefined();
		expect(consumePendingN8nChatMessage('agent-1')).toBeUndefined();
	});

	it('returns undefined when nothing was ever stored', () => {
		expect(consumePendingN8nChatMessage('agent-1')).toBeUndefined();
	});
});
