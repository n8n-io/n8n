import { AgentEventBus } from '../runtime/event-bus';

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
});
