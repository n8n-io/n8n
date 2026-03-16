import { EventEmitter } from 'node:events';

import { nanoid } from 'nanoid';

import type { EngineEvent, EmittableEvent, StepEvent, ExecutionEvent } from './event-bus.types';
import type { EventRelay } from './event-relay';
import type { MetricsService } from './metrics.service';

type EventHandler<T> = (event: T) => void | Promise<void>;

/**
 * Typed event bus for the engine. Wraps Node.js EventEmitter with:
 * - Strongly typed event emission and subscription
 * - Wildcard listeners for event categories (step:*, execution:*)
 * - An `onAny` method that receives all engine events
 * - Auto-assigned `eventId` and `createdAt` on every emitted event
 * - Optional EventRelay for cross-instance event broadcasting
 */
export class EngineEventBus {
	private emitter = new EventEmitter();

	constructor(
		private readonly relay?: EventRelay,
		private readonly metrics?: MetricsService,
	) {
		this.emitter.setMaxListeners(100);
	}

	emit(input: EmittableEvent): void {
		const event: EngineEvent = {
			...input,
			eventId: input.eventId ?? nanoid(),
			createdAt: input.createdAt ?? Date.now(),
		} as EngineEvent;

		this.safeEmit(event.type, event);

		// Wildcard: emit 'step:*' for all step events, 'execution:*' for all execution events
		const prefix = event.type.split(':')[0];
		this.safeEmit(`${prefix}:*`, event);

		// Broadcast to other instances via relay (no-op for LocalEventRelay)
		this.relay?.broadcast(event);

		// Track event publication metrics
		this.metrics?.eventsPublishedTotal.inc({ type: event.type });
	}

	/**
	 * Emit an event, catching errors from async handlers to prevent
	 * unhandled promise rejections from crashing the process.
	 */
	private safeEmit(eventName: string, event: EngineEvent): void {
		const listeners = this.emitter.listeners(eventName);
		for (const listener of listeners) {
			try {
				const result = listener(event);
				// If the handler returns a promise, catch any rejection
				if (result instanceof Promise) {
					result.catch((err: unknown) => {
						console.error(`Async event handler error for ${event.type}:`, err);
					});
				}
			} catch (err) {
				console.error(`Event handler error for ${event.type}:`, err);
			}
		}
	}

	on<T extends EngineEvent>(eventType: T['type'], handler: EventHandler<T>): void {
		this.emitter.on(eventType, handler as EventHandler<EngineEvent>);
	}

	onStepEvent(handler: EventHandler<StepEvent>): void {
		this.emitter.on('step:*', handler as EventHandler<EngineEvent>);
	}

	onExecutionEvent(handler: EventHandler<ExecutionEvent>): void {
		this.emitter.on('execution:*', handler as EventHandler<EngineEvent>);
	}

	onAny(handler: EventHandler<EngineEvent>): void {
		this.emitter.on('step:*', handler as EventHandler<EngineEvent>);
		this.emitter.on('execution:*', handler as EventHandler<EngineEvent>);
		this.emitter.on('webhook:respond', handler as EventHandler<EngineEvent>);
	}

	off(eventType: string, handler: (...args: unknown[]) => void): void {
		this.emitter.off(eventType, handler);
	}

	removeAllListeners(): void {
		this.emitter.removeAllListeners();
	}

	async close(): Promise<void> {
		this.removeAllListeners();
		await this.relay?.close();
	}
}
