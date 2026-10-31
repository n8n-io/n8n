import { UnexpectedError } from '../common';
import { createConsoleLogger, type EngineLogger } from '../logging';
import type { WorkQueue } from './work-queue.types';

/**
 * In-memory `WorkQueue`. When a handler is registered it dispatches messages
 * on microtasks, up to the configured number of in-flight handlers.
 */
export class InMemoryWorkQueue<TMessage> implements WorkQueue<TMessage> {
	constructor(
		private readonly logger: EngineLogger = createConsoleLogger(),
		private readonly concurrency = 1,
	) {
		if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
			throw new UnexpectedError('Work queue concurrency must be a positive safe integer');
		}
	}

	private pending: TMessage[] = [];

	private handler: ((message: TMessage) => Promise<void>) | undefined;

	private inFlight = 0;

	private idleWaiters: Array<() => void> = [];

	// eslint-disable-next-line @typescript-eslint/require-await -- satisfies async interface; dispatch is scheduled, not awaited
	async publish(message: TMessage): Promise<void> {
		this.pending.push(message);
		this.startDispatchLoop();
	}

	start(handler: (message: TMessage) => Promise<void>): void {
		this.handler = handler;
		this.startDispatchLoop();
	}

	async stop(): Promise<void> {
		this.handler = undefined;
		// Only in-flight work is awaited; anything still queued has no consumer to
		// dispatch it, so waiting on it would never return.
		if (this.inFlight === 0) return;
		await new Promise<void>((resolve) => this.idleWaiters.push(resolve));
	}

	/**
	 * Fills free slots in publish order. Each completion can refill its own slot.
	 */
	private startDispatchLoop(): void {
		while (this.handler && this.pending.length > 0 && this.inFlight < this.concurrency) {
			const [message] = this.pending.splice(0, 1);
			this.inFlight += 1;
			this.dispatchMessage(message, this.handler).catch((error: unknown) => {
				this.logger.error('work queue dispatch failed', { error });
			});
		}
	}

	private async dispatchMessage(
		message: TMessage,
		handler: (message: TMessage) => Promise<void>,
	): Promise<void> {
		// Reserve the slot before calling user code, including synchronous throws.
		await Promise.resolve();
		try {
			await handler(message);
		} catch (error) {
			// A failed message must not strand those behind it.
			this.logger.error('work queue handler failed', { error });
		} finally {
			this.inFlight -= 1;
			this.startDispatchLoop();
			if (this.inFlight === 0) {
				const waiters = this.idleWaiters;
				this.idleWaiters = [];
				for (const resolve of waiters) resolve();
			}
		}
	}
}
