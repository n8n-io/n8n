import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EngineEventBus } from '../event-bus.service';
import type {
	StepStartedEvent,
	StepCompletedEvent,
	StepFailedEvent,
	ExecutionStartedEvent,
	ExecutionCompletedEvent,
	WebhookRespondEvent,
} from '../event-bus.types';

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

			const event: StepStartedEvent = {
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			};
			bus.emit(event);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(event);
		});

		it('emits and receives a step:completed event', () => {
			const handler = vi.fn();
			bus.on<StepCompletedEvent>('step:completed', handler);

			const event: StepCompletedEvent = {
				type: 'step:completed',
				executionId: 'exec-1',
				stepId: 'step-1',
				output: { value: 42 },
				durationMs: 150,
			};
			bus.emit(event);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(event);
		});

		it('emits and receives a step:failed event', () => {
			const handler = vi.fn();
			bus.on<StepFailedEvent>('step:failed', handler);

			const event: StepFailedEvent = {
				type: 'step:failed',
				executionId: 'exec-1',
				stepId: 'step-1',
				error: {
					message: 'boom',
					code: 'UNKNOWN',
					category: 'step',
					retriable: true,
				},
			};
			bus.emit(event);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(event);
		});

		it('emits and receives an execution:started event', () => {
			const handler = vi.fn();
			bus.on<ExecutionStartedEvent>('execution:started', handler);

			const event: ExecutionStartedEvent = {
				type: 'execution:started',
				executionId: 'exec-1',
			};
			bus.emit(event);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(event);
		});

		it('emits and receives an execution:completed event', () => {
			const handler = vi.fn();
			bus.on<ExecutionCompletedEvent>('execution:completed', handler);

			const event: ExecutionCompletedEvent = {
				type: 'execution:completed',
				executionId: 'exec-1',
				result: { done: true },
			};
			bus.emit(event);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(event);
		});

		it('emits and receives a webhook:respond event', () => {
			const handler = vi.fn();
			bus.on<WebhookRespondEvent>('webhook:respond', handler);

			const event: WebhookRespondEvent = {
				type: 'webhook:respond',
				executionId: 'exec-1',
				statusCode: 200,
				body: { ok: true },
				headers: { 'content-type': 'application/json' },
			};
			bus.emit(event);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(event);
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

			const started: StepStartedEvent = {
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			};
			const completed: StepCompletedEvent = {
				type: 'step:completed',
				executionId: 'exec-1',
				stepId: 'step-1',
				output: 42,
				durationMs: 100,
			};
			const failed: StepFailedEvent = {
				type: 'step:failed',
				executionId: 'exec-1',
				stepId: 'step-2',
				error: {
					message: 'err',
					code: 'UNKNOWN',
					category: 'step',
					retriable: false,
				},
			};

			bus.emit(started);
			bus.emit(completed);
			bus.emit(failed);

			expect(handler).toHaveBeenCalledTimes(3);
			expect(handler).toHaveBeenNthCalledWith(1, started);
			expect(handler).toHaveBeenNthCalledWith(2, completed);
			expect(handler).toHaveBeenNthCalledWith(3, failed);
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

			const started: ExecutionStartedEvent = {
				type: 'execution:started',
				executionId: 'exec-1',
			};
			const completed: ExecutionCompletedEvent = {
				type: 'execution:completed',
				executionId: 'exec-1',
				result: 'done',
			};

			bus.emit(started);
			bus.emit(completed);

			expect(handler).toHaveBeenCalledTimes(2);
			expect(handler).toHaveBeenNthCalledWith(1, started);
			expect(handler).toHaveBeenNthCalledWith(2, completed);
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

			const stepEvent: StepStartedEvent = {
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			};
			const execEvent: ExecutionStartedEvent = {
				type: 'execution:started',
				executionId: 'exec-1',
			};
			const webhookEvent: WebhookRespondEvent = {
				type: 'webhook:respond',
				executionId: 'exec-1',
				statusCode: 200,
				body: null,
			};

			bus.emit(stepEvent);
			bus.emit(execEvent);
			bus.emit(webhookEvent);

			expect(handler).toHaveBeenCalledTimes(3);
			expect(handler).toHaveBeenNthCalledWith(1, stepEvent);
			expect(handler).toHaveBeenNthCalledWith(2, execEvent);
			expect(handler).toHaveBeenNthCalledWith(3, webhookEvent);
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

			const event: StepStartedEvent = {
				type: 'step:started',
				executionId: 'exec-1',
				stepId: 'step-1',
				attempt: 1,
			};
			bus.emit(event);

			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).toHaveBeenCalledOnce();
		});

		it('typed handler and wildcard handler both fire', () => {
			const typedHandler = vi.fn();
			const wildcardHandler = vi.fn();

			bus.on<StepCompletedEvent>('step:completed', typedHandler);
			bus.onStepEvent(wildcardHandler);

			const event: StepCompletedEvent = {
				type: 'step:completed',
				executionId: 'exec-1',
				stepId: 'step-1',
				output: 'result',
				durationMs: 50,
			};
			bus.emit(event);

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
});
