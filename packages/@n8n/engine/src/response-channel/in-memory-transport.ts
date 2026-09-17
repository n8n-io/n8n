import { EventEmitter } from 'node:events';

import type { ResponseTransport, Unsubscribe } from './response-transport';

/**
 * In-process `ResponseTransport`, for a deployment where both planes share a
 * process.
 *
 * One emitter event per execution, which is the same addressing a networked
 * transport gives each run.
 *
 * It carries frames rather than objects, exactly as a networked transport does.
 * The `JSON.stringify` it pays for is the point: an integrated deployment that
 * passed live objects would accept a response a split deployment mangles, and
 * the integrated one is the one under test.
 */
export class InMemoryResponseTransport implements ResponseTransport {
	private readonly executions = new EventEmitter();

	publish(executionId: string, frame: string): void {
		this.executions.emit(executionId, frame);
	}

	subscribe(executionId: string, handler: (frame: string) => void): Unsubscribe {
		this.executions.on(executionId, handler);

		return () => this.executions.off(executionId, handler);
	}

	async stop(): Promise<void> {
		this.executions.removeAllListeners();
	}
}
