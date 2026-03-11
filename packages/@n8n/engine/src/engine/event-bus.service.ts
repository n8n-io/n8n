import { EventEmitter } from 'node:events';

import type { EngineEvent, StepEvent, ExecutionEvent } from './event-bus.types';

type EventHandler<T> = (event: T) => void | Promise<void>;

/**
 * Typed event bus for the engine. Wraps Node.js EventEmitter with:
 * - Strongly typed event emission and subscription
 * - Wildcard listeners for event categories (step:*, execution:*)
 * - An `onAny` method that receives all engine events
 */
export class EngineEventBus {
	private emitter = new EventEmitter();

	constructor() {
		this.emitter.setMaxListeners(100);
	}

	emit(event: EngineEvent): void {
		this.emitter.emit(event.type, event);

		// Wildcard: emit 'step:*' for all step events, 'execution:*' for all execution events
		const prefix = event.type.split(':')[0];
		this.emitter.emit(`${prefix}:*`, event);
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
}
