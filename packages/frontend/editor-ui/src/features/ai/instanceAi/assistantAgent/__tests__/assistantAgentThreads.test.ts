import {
	consumePendingAssistantAgentMessage,
	discardPendingAssistantAgentMessage,
	knownAssistantThreadRuntime,
	lookUpAssistantThreadRuntime,
	rememberAssistantAgentThread,
	stashPendingAssistantAgentMessage,
} from '../assistantAgentThreads';

describe('assistantAgentThreads', () => {
	describe('knownAssistantThreadRuntime', () => {
		const options = { assistantAgentEnabled: true, isAssistantThread: () => false };

		it('knows a thread that this tab created on the Assistant agent', () => {
			rememberAssistantAgentThread('agent-thread', 'project-1');

			expect(knownAssistantThreadRuntime('agent-thread', options)).toEqual({
				kind: 'assistant-agent',
				projectId: 'project-1',
			});
		});

		it('opens every other thread in the current Assistant while the Assistant agent is off', () => {
			expect(
				knownAssistantThreadRuntime('thread-1', { ...options, assistantAgentEnabled: false }),
			).toEqual({ kind: 'assistant' });
		});

		it('opens a listed current Assistant thread without a lookup', () => {
			expect(
				knownAssistantThreadRuntime('thread-1', { ...options, isAssistantThread: () => true }),
			).toEqual({ kind: 'assistant' });
		});

		it('needs a lookup for an unknown thread while the Assistant agent is on', () => {
			expect(knownAssistantThreadRuntime('unknown-thread', options)).toBeUndefined();
		});
	});

	describe('lookUpAssistantThreadRuntime', () => {
		it('opens a thread that the agents runtime finds, and remembers it', async () => {
			const fetchAgentThread = vi.fn(async () => ({ projectId: 'project-2' }));

			await expect(lookUpAssistantThreadRuntime('found-thread', fetchAgentThread)).resolves.toEqual(
				{ kind: 'assistant-agent', projectId: 'project-2' },
			);
			expect(
				knownAssistantThreadRuntime('found-thread', {
					assistantAgentEnabled: true,
					isAssistantThread: () => false,
				}),
			).toEqual({ kind: 'assistant-agent', projectId: 'project-2' });
		});

		it('opens a thread that the agents runtime does not find in the current Assistant', async () => {
			const fetchAgentThread = vi.fn(async () => {
				throw new Error('Session not found');
			});

			await expect(
				lookUpAssistantThreadRuntime('missing-thread', fetchAgentThread),
			).resolves.toEqual({ kind: 'assistant' });
		});
	});

	describe('pending first message', () => {
		const message = { threadId: 'thread-1', text: 'hello', files: [], references: [] };

		it('hands the message over once, to its own thread only', () => {
			stashPendingAssistantAgentMessage(message);
			expect(consumePendingAssistantAgentMessage('other-thread')).toBeUndefined();
			expect(consumePendingAssistantAgentMessage('thread-1')).toBeUndefined();

			stashPendingAssistantAgentMessage(message);
			expect(consumePendingAssistantAgentMessage('thread-1')).toBe(message);
			expect(consumePendingAssistantAgentMessage('thread-1')).toBeUndefined();
		});

		it('discards only the message that it still holds', () => {
			const later = { ...message, text: 'later' };
			stashPendingAssistantAgentMessage(message);
			stashPendingAssistantAgentMessage(later);

			expect(discardPendingAssistantAgentMessage(message)).toBe(false);
			expect(discardPendingAssistantAgentMessage(later)).toBe(true);
			expect(consumePendingAssistantAgentMessage('thread-1')).toBeUndefined();
		});
	});
});
