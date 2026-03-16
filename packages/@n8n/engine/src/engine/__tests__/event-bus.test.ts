import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EngineEventBus } from '../event-bus.service';
import type { StepStartedEvent } from '../event-bus.types';

describe('EngineEventBus', () => {
	let bus: EngineEventBus;

	beforeEach(() => {
		bus = new EngineEventBus();
	});

	// -----------------------------------------------------------------------
	// Typed event emission and reception
	// -----------------------------------------------------------------------

	describe('typed events', () => {
		it('emits and receives a step:started event', () => {
			const handler = vi.fn();
			bus.on<StepStartedEvent>('step:started', handler);

			const input = {
				type: 'step:started' as const,
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			};
			bus.emit(input);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(expect.objectContaining(input));
		});

		it('emits and receives a step:completed event', () => {
			const handler = vi.fn();
			bus.on('step:completed', handler);

			const input = {
				type: 'step:completed' as const,
				executionId: 'exec-1',
				stepId: 'step-1',
				output: { value: 42 },
				durationMs: 150,
			};
			bus.emit(input);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(expect.objectContaining(input));
		});

		it('emits and receives a step:failed event', () => {
			const handler = vi.fn();
			bus.on('step:failed', handler);

			const input = {
				type: 'step:failed' as const,
				executionId: 'exec-1',
				stepId: 'step-1',
				error: {
					message: 'boom',
					code: 'UNKNOWN' as const,
					category: 'step' as const,
					retriable: true,
				},
			};
			bus.emit(input);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(expect.objectContaining(input));
		});

		it('emits and receives an execution:started event', () => {
			const handler = vi.fn();
			bus.on('execution:started', handler);

			const input = {
				type: 'execution:started' as const,
				executionId: 'exec-1',
			};
			bus.emit(input);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(expect.objectContaining(input));
		});

		it('emits and receives an execution:completed event', () => {
			const handler = vi.fn();
			bus.on('execution:completed', handler);

			const input = {
				type: 'execution:completed' as const,
				executionId: 'exec-1',
				result: { done: true },
			};
			bus.emit(input);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(expect.objectContaining(input));
		});

		it('emits and receives a webhook:respond event', () => {
			const handler = vi.fn();
			bus.on('webhook:respond', handler);

			const input = {
				type: 'webhook:respond' as const,
				executionId: 'exec-1',
				statusCode: 200,
				body: { ok: true },
				headers: { 'content-type': 'application/json' },
			};
			bus.emit(input);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(expect.objectContaining(input));
		});

		it('does not fire handler for unrelated event type', () => {
			const handler = vi.fn();
			bus.on<StepStartedEvent>('step:started', handler);

			bus.emit({
				type: 'step:completed',
				executionId: 'exec-1',
				stepId: 'step-1',
				output: null,
				durationMs: 10,
			});

			expect(handler).not.toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// Wildcard listeners
	// -----------------------------------------------------------------------

	describe('wildcard listeners', () => {
		it('onStepEvent receives all step events', () => {
			const handler = vi.fn();
			bus.onStepEvent(handler);

			const started = {
				type: 'step:started' as const,
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			};
			const completed = {
				type: 'step:completed' as const,
				executionId: 'exec-1',
				stepId: 'step-1',
				output: 42,
				durationMs: 100,
			};
			const failed = {
				type: 'step:failed' as const,
				executionId: 'exec-1',
				stepId: 'step-2',
				error: {
					message: 'err',
					code: 'UNKNOWN' as const,
					category: 'step' as const,
					retriable: false,
				},
			};

			bus.emit(started);
			bus.emit(completed);
			bus.emit(failed);

			expect(handler).toHaveBeenCalledTimes(3);
			expect(handler).toHaveBeenNthCalledWith(1, expect.objectContaining(started));
			expect(handler).toHaveBeenNthCalledWith(2, expect.objectContaining(completed));
			expect(handler).toHaveBeenNthCalledWith(3, expect.objectContaining(failed));
		});

		it('onStepEvent does not receive execution events', () => {
			const handler = vi.fn();
			bus.onStepEvent(handler);

			bus.emit({
				type: 'execution:started',
				executionId: 'exec-1',
			});

			expect(handler).not.toHaveBeenCalled();
		});

		it('onExecutionEvent receives all execution events', () => {
			const handler = vi.fn();
			bus.onExecutionEvent(handler);

			const started = {
				type: 'execution:started' as const,
				executionId: 'exec-1',
			};
			const completed = {
				type: 'execution:completed' as const,
				executionId: 'exec-1',
				result: 'done',
			};

			bus.emit(started);
			bus.emit(completed);

			expect(handler).toHaveBeenCalledTimes(2);
			expect(handler).toHaveBeenNthCalledWith(1, expect.objectContaining(started));
			expect(handler).toHaveBeenNthCalledWith(2, expect.objectContaining(completed));
		});

		it('onExecutionEvent does not receive step events', () => {
			const handler = vi.fn();
			bus.onExecutionEvent(handler);

			bus.emit({
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			});

			expect(handler).not.toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// onAny
	// -----------------------------------------------------------------------

	describe('onAny', () => {
		it('receives step events, execution events, and webhook events', () => {
			const handler = vi.fn();
			bus.onAny(handler);

			const stepInput = {
				type: 'step:started' as const,
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			};
			const execInput = {
				type: 'execution:started' as const,
				executionId: 'exec-1',
			};
			const webhookInput = {
				type: 'webhook:respond' as const,
				executionId: 'exec-1',
				statusCode: 200,
				body: null,
			};

			bus.emit(stepInput);
			bus.emit(execInput);
			bus.emit(webhookInput);

			expect(handler).toHaveBeenCalledTimes(3);
			expect(handler).toHaveBeenNthCalledWith(1, expect.objectContaining(stepInput));
			expect(handler).toHaveBeenNthCalledWith(2, expect.objectContaining(execInput));
			expect(handler).toHaveBeenNthCalledWith(3, expect.objectContaining(webhookInput));
		});
	});

	// -----------------------------------------------------------------------
	// Multiple listeners
	// -----------------------------------------------------------------------

	describe('multiple listeners', () => {
		it('multiple handlers for the same event type all fire', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();
			bus.on<StepStartedEvent>('step:started', handler1);
			bus.on<StepStartedEvent>('step:started', handler2);

			bus.emit({
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			});

			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).toHaveBeenCalledOnce();
		});

		it('typed handler and wildcard handler both fire', () => {
			const typedHandler = vi.fn();
			const wildcardHandler = vi.fn();

			bus.on('step:completed', typedHandler);
			bus.onStepEvent(wildcardHandler);

			bus.emit({
				type: 'step:completed',
				executionId: 'exec-1',
				stepId: 'step-1',
				output: 'result',
				durationMs: 50,
			});

			expect(typedHandler).toHaveBeenCalledOnce();
			expect(wildcardHandler).toHaveBeenCalledOnce();
		});
	});

	// -----------------------------------------------------------------------
	// Removing listeners
	// -----------------------------------------------------------------------

	describe('removing listeners', () => {
		it('off removes a specific handler', () => {
			const handler = vi.fn();
			bus.on<StepStartedEvent>('step:started', handler);

			bus.off('step:started', handler);
			bus.emit({
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			});

			expect(handler).not.toHaveBeenCalled();
		});

		it('removeAllListeners clears all handlers', () => {
			const stepHandler = vi.fn();
			const execHandler = vi.fn();
			const anyHandler = vi.fn();

			bus.on<StepStartedEvent>('step:started', stepHandler);
			bus.onExecutionEvent(execHandler);
			bus.onAny(anyHandler);

			bus.removeAllListeners();

			bus.emit({
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			});
			bus.emit({
				type: 'execution:started',
				executionId: 'exec-1',
			});
			bus.emit({
				type: 'webhook:respond',
				executionId: 'exec-1',
				statusCode: 200,
				body: null,
			});

			expect(stepHandler).not.toHaveBeenCalled();
			expect(execHandler).not.toHaveBeenCalled();
			expect(anyHandler).not.toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// Async handlers
	// -----------------------------------------------------------------------

	describe('async handlers', () => {
		it('supports async event handlers', async () => {
			const results: string[] = [];

			bus.on<StepStartedEvent>('step:started', async (event) => {
				await new Promise<void>((resolve) => setTimeout(resolve, 5));
				results.push(`handled:${event.stepId}`);
			});

			bus.emit({
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			});

			// Give async handler time to complete
			await new Promise<void>((resolve) => setTimeout(resolve, 20));
			expect(results).toEqual(['handled:step-1']);
		});
	});

	// -----------------------------------------------------------------------
	// eventId and createdAt auto-assignment
	// -----------------------------------------------------------------------

	describe('eventId and createdAt', () => {
		it('should auto-assign eventId and createdAt on emit', () => {
			const handler = vi.fn();
			bus.on('step:started', handler);

			bus.emit({
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			});

			expect(handler).toHaveBeenCalledWith(
				expect.objectContaining({
					eventId: expect.any(String),
					createdAt: expect.any(Number),
					type: 'step:started',
				}),
			);
		});

		it('should generate unique eventIds', () => {
			const events: unknown[] = [];
			bus.on('step:started', (e) => {
				events.push(e);
			});

			bus.emit({ type: 'step:started', executionId: 'e1', stepId: 's1', attempt: 1 });
			bus.emit({ type: 'step:started', executionId: 'e1', stepId: 's1', attempt: 2 });

			const ids = events.map((e) => (e as { eventId: string }).eventId);
			expect(ids[0]).not.toBe(ids[1]);
		});

		it('should not overwrite eventId if already set', () => {
			const handler = vi.fn();
			bus.on('step:started', handler);

			bus.emit({
				type: 'step:started',
				executionId: 'e1',
				stepId: 's1',
				attempt: 1,
				eventId: 'custom-id',
				createdAt: 12345,
			});

			expect(handler).toHaveBeenCalledWith(
				expect.objectContaining({ eventId: 'custom-id', createdAt: 12345 }),
			);
		});
	});

	// -----------------------------------------------------------------------
	// close()
	// -----------------------------------------------------------------------

	describe('close', () => {
		it('should call close() without errors when no relay', async () => {
			await expect(bus.close()).resolves.toBeUndefined();
		});
	});
});

// ---------------------------------------------------------------------------
// EngineEventBus with relay
// ---------------------------------------------------------------------------

describe('EngineEventBus with relay', () => {
	it('should broadcast events to relay on emit', async () => {
		const { LocalEventRelay } = await import('../event-relay');
		const relay = new LocalEventRelay();
		const relaySpy = vi.spyOn(relay, 'broadcast');
		const bus = new EngineEventBus(relay);

		bus.emit({
			type: 'step:started',
			executionId: 'e1',
			stepId: 's1',
			attempt: 1,
		});

		expect(relaySpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'step:started', eventId: expect.any(String) }),
		);
	});

	it('should close relay on close()', async () => {
		const { LocalEventRelay } = await import('../event-relay');
		const relay = new LocalEventRelay();
		const closeSpy = vi.spyOn(relay, 'close');
		const bus = new EngineEventBus(relay);

		await bus.close();
		expect(closeSpy).toHaveBeenCalled();
	});

	it('should broadcast execution events to relay', async () => {
		const { LocalEventRelay } = await import('../event-relay');
		const relay = new LocalEventRelay();
		const relaySpy = vi.spyOn(relay, 'broadcast');
		const bus = new EngineEventBus(relay);

		bus.emit({
			type: 'execution:started',
			executionId: 'e1',
		});

		expect(relaySpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'execution:started', executionId: 'e1' }),
		);
	});

	it('should broadcast webhook events to relay', async () => {
		const { LocalEventRelay } = await import('../event-relay');
		const relay = new LocalEventRelay();
		const relaySpy = vi.spyOn(relay, 'broadcast');
		const bus = new EngineEventBus(relay);

		bus.emit({
			type: 'webhook:respond',
			executionId: 'e1',
			statusCode: 200,
			body: { ok: true },
		});

		expect(relaySpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'webhook:respond', executionId: 'e1' }),
		);
	});
});
