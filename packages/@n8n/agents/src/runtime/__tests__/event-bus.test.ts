import { AgentEventBus } from '../event-bus';

describe('AgentEventBus', () => {
	describe('resetAbort', () => {
		it('should create a fresh signal on reset', () => {
			const bus = new AgentEventBus();
			bus.resetAbort();
			expect(bus.isAborted).toBe(false);
			expect(bus.signal.aborted).toBe(false);
		});

		it('should respect agent.abort()', () => {
			const bus = new AgentEventBus();
			bus.resetAbort();
			bus.abort();
			expect(bus.isAborted).toBe(true);
			expect(bus.signal.aborted).toBe(true);
		});

		it('should respect external abort signal', () => {
			const bus = new AgentEventBus();
			const external = new AbortController();
			bus.resetAbort(external.signal);

			expect(bus.isAborted).toBe(false);
			external.abort();
			expect(bus.isAborted).toBe(true);
			expect(bus.signal.aborted).toBe(true);
		});

		it('should abort when either internal or external signal fires', () => {
			const bus = new AgentEventBus();
			const external = new AbortController();
			bus.resetAbort(external.signal);

			bus.abort();
			expect(bus.isAborted).toBe(true);
			expect(external.signal.aborted).toBe(false);
		});

		it('should allow reuse after reset', () => {
			const bus = new AgentEventBus();
			bus.resetAbort();
			bus.abort();
			expect(bus.isAborted).toBe(true);

			bus.resetAbort();
			expect(bus.isAborted).toBe(false);
		});
	});

	describe('createAbortScope', () => {
		it('should abort active run scopes when the bus aborts', () => {
			const bus = new AgentEventBus();
			const first = bus.createAbortScope();
			const second = bus.createAbortScope();

			bus.abort();

			expect(first.isAborted).toBe(true);
			expect(second.isAborted).toBe(true);
		});

		it('should remove external abort listeners when a scope is disposed', () => {
			const bus = new AgentEventBus();
			const external = new AbortController();
			const removeListener = vi.spyOn(external.signal, 'removeEventListener');

			const scope = bus.createAbortScope(external.signal);
			scope.dispose();
			external.abort();

			expect(removeListener).toHaveBeenCalledTimes(1);
			expect(scope.isAborted).toBe(false);
		});
	});
});
