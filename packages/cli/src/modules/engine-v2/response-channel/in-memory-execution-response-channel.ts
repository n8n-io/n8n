import { EventEmitter } from 'node:events';

import type { UnsubscribeExecutionResponse } from './execution-response-receiver';

/** Carries serialized execution responses between endpoints in this process. */
export class InMemoryExecutionResponseChannel {
	private readonly emitter = new EventEmitter();

	publish(executionId: string, frame: string): void {
		this.emitter.emit(executionId, frame);
	}

	subscribe(executionId: string, handler: (frame: string) => void): UnsubscribeExecutionResponse {
		this.emitter.on(executionId, handler);
		return () => this.emitter.off(executionId, handler);
	}
}
