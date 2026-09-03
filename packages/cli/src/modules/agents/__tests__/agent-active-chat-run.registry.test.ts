import { AgentActiveChatRunRegistry } from '../agent-active-chat-run.registry';

describe('AgentActiveChatRunRegistry', () => {
	it('aborts every run a user has on one agent', () => {
		const registry = new AgentActiveChatRunRegistry();
		const first = new AbortController();
		const second = new AbortController();
		registry.register('agent-1', 'user-1', first);
		registry.register('agent-1', 'user-1', second);

		expect(registry.cancel('agent-1', 'user-1')).toBe(true);
		expect(first.signal.aborted).toBe(true);
		expect(second.signal.aborted).toBe(true);
	});

	it('scopes runs to the agent and the user', () => {
		const registry = new AgentActiveChatRunRegistry();
		const controller = new AbortController();
		registry.register('agent-1', 'user-1', controller);

		expect(registry.cancel('agent-2', 'user-1')).toBe(false);
		expect(registry.cancel('agent-1', 'user-2')).toBe(false);
		expect(controller.signal.aborted).toBe(false);
	});

	it('forgets a run once its disposer runs', () => {
		const registry = new AgentActiveChatRunRegistry();
		const controller = new AbortController();
		const dispose = registry.register('agent-1', 'user-1', controller);

		dispose();

		expect(registry.cancel('agent-1', 'user-1')).toBe(false);
		expect(controller.signal.aborted).toBe(false);
	});

	it('keeps the other runs when one disposer runs', () => {
		const registry = new AgentActiveChatRunRegistry();
		const finished = new AbortController();
		const running = new AbortController();
		const disposeFinished = registry.register('agent-1', 'user-1', finished);
		registry.register('agent-1', 'user-1', running);

		disposeFinished();

		expect(registry.cancel('agent-1', 'user-1')).toBe(true);
		expect(finished.signal.aborted).toBe(false);
		expect(running.signal.aborted).toBe(true);
	});

	it('tolerates a disposer running twice', () => {
		const registry = new AgentActiveChatRunRegistry();
		const dispose = registry.register('agent-1', 'user-1', new AbortController());

		dispose();

		expect(() => dispose()).not.toThrow();
	});
});
