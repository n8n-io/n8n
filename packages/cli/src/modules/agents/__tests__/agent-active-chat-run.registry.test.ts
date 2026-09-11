import {
	AgentActiveChatRunRegistry,
	CHAT_RUN_INTERRUPTED_BY_SHUTDOWN,
} from '../agent-active-chat-run.registry';

const key = (overrides: { agentId?: string; userId?: string; threadId?: string } = {}) => ({
	agentId: 'agent-1',
	userId: 'user-1',
	threadId: 'thread-1',
	...overrides,
});

describe('AgentActiveChatRunRegistry', () => {
	it('aborts every run on the thread', () => {
		const registry = new AgentActiveChatRunRegistry();
		const turn = new AbortController();
		const resumedTurn = new AbortController();
		registry.register(key(), turn);
		registry.register(key(), resumedTurn);

		expect(registry.cancel(key())).toBe(true);
		expect(turn.signal.aborted).toBe(true);
		expect(resumedTurn.signal.aborted).toBe(true);
	});

	it('leaves the same user’s other threads on the agent running', () => {
		const registry = new AgentActiveChatRunRegistry();
		const stopped = new AbortController();
		const other = new AbortController();
		registry.register(key({ threadId: 'thread-stopped' }), stopped);
		registry.register(key({ threadId: 'thread-other' }), other);

		expect(registry.cancel(key({ threadId: 'thread-stopped' }))).toBe(true);
		expect(stopped.signal.aborted).toBe(true);
		expect(other.signal.aborted).toBe(false);
	});

	it('scopes runs to the agent, the user and the thread', () => {
		const registry = new AgentActiveChatRunRegistry();
		const controller = new AbortController();
		registry.register(key(), controller);

		expect(registry.cancel(key({ agentId: 'agent-2' }))).toBe(false);
		expect(registry.cancel(key({ userId: 'user-2' }))).toBe(false);
		expect(registry.cancel(key({ threadId: 'thread-2' }))).toBe(false);
		expect(controller.signal.aborted).toBe(false);
	});

	it('forgets a run once its disposer runs', () => {
		const registry = new AgentActiveChatRunRegistry();
		const controller = new AbortController();
		const dispose = registry.register(key(), controller);

		dispose();

		expect(registry.cancel(key())).toBe(false);
		expect(controller.signal.aborted).toBe(false);
	});

	it('keeps the other runs when one disposer runs', () => {
		const registry = new AgentActiveChatRunRegistry();
		const finished = new AbortController();
		const running = new AbortController();
		const disposeFinished = registry.register(key(), finished);
		registry.register(key(), running);

		disposeFinished();

		expect(registry.cancel(key())).toBe(true);
		expect(finished.signal.aborted).toBe(false);
		expect(running.signal.aborted).toBe(true);
	});

	it('aborts every registered run on shutdown, across threads and users', () => {
		const registry = new AgentActiveChatRunRegistry();
		const mine = new AbortController();
		const otherThread = new AbortController();
		const otherUser = new AbortController();
		registry.register(key(), mine);
		registry.register(key({ threadId: 'thread-2' }), otherThread);
		registry.register(key({ userId: 'user-2' }), otherUser);

		registry.abortAll();

		for (const controller of [mine, otherThread, otherUser]) {
			expect(controller.signal.aborted).toBe(true);
			// The reason is what stops the run being recorded as a user cancel.
			expect(controller.signal.reason).toBe(CHAT_RUN_INTERRUPTED_BY_SHUTDOWN);
		}
	});

	it('marks a user stop differently from a shutdown', () => {
		const registry = new AgentActiveChatRunRegistry();
		const controller = new AbortController();
		registry.register(key(), controller);

		registry.cancel(key());

		expect(controller.signal.reason).not.toBe(CHAT_RUN_INTERRUPTED_BY_SHUTDOWN);
	});

	it('tolerates a disposer running twice', () => {
		const registry = new AgentActiveChatRunRegistry();
		const dispose = registry.register(key(), new AbortController());

		dispose();

		expect(() => dispose()).not.toThrow();
	});
});
