import { AgentEventBus } from '../state/event-bus';

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

			const scope = bus.createAbortScope({ externalSignal: external.signal });
			scope.dispose();
			external.abort();

			expect(removeListener).toHaveBeenCalledTimes(1);
			expect(scope.isAborted).toBe(false);
		});

		it('should stop the current step without aborting the run', () => {
			const bus = new AgentEventBus();
			const scope = bus.createAbortScope();

			bus.interrupt();

			expect(scope.isInterrupted).toBe(true);
			expect(scope.isAborted).toBe(false);
		});

		it('should arm a fresh step signal once the interrupt is consumed', () => {
			const bus = new AgentEventBus();
			const scope = bus.createAbortScope();

			bus.interrupt();

			expect(scope.consumeInterrupt()).toBe(true);
			expect(scope.isInterrupted).toBe(false);
			// A second consume is a no-op, and the next step runs normally.
			expect(scope.consumeInterrupt()).toBe(false);
			expect(scope.signal.aborted).toBe(false);
			expect(scope.isAborted).toBe(false);
		});

		it('should honour an interrupt signal supplied by the host', () => {
			const bus = new AgentEventBus();
			const interrupt = new AbortController();
			const scope = bus.createAbortScope({ interruptSignal: interrupt.signal });

			interrupt.abort();

			expect(scope.isInterrupted).toBe(true);
			expect(scope.isAborted).toBe(false);
		});

		it('should count an interrupt signal that fired before the scope existed', () => {
			const bus = new AgentEventBus();
			const interrupt = new AbortController();
			interrupt.abort();

			const scope = bus.createAbortScope({ interruptSignal: interrupt.signal });

			expect(scope.isInterrupted).toBe(true);
		});
	});
});
