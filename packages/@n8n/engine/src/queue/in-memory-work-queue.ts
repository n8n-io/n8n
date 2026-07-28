import type { WorkQueue } from './work-queue.types';

/**
 * In-memory `WorkQueue`. When a handler is registered it dispatches messages
 * sequentially on a microtask.
 */
export class InMemoryWorkQueue<TMessage> implements WorkQueue<TMessage> {
	/** Everything ever published, retained so tests can assert on it. */
	readonly messages: TMessage[] = [];

	private pending: TMessage[] = [];

	private handler: ((message: TMessage) => Promise<void>) | undefined;

	private dispatching = false;

	private idleWaiters: Array<() => void> = [];

	// eslint-disable-next-line @typescript-eslint/require-await -- satisfies async interface; dispatch is scheduled, not awaited
	async publish(message: TMessage): Promise<void> {
		this.messages.push(message);
		this.pending.push(message);
		this.ensureDispatching();
	}

	start(handler: (message: TMessage) => Promise<void>): void {
		this.handler = handler;
		this.ensureDispatching();
	}

	async stop(): Promise<void> {
		this.handler = undefined;
		await this.drain();
	}

	/**
	 * Resolves once in-flight dispatch settles. Messages with no consumer to
	 * dispatch them stay pending rather than blocking the caller forever.
	 */
	async drain(): Promise<void> {
		if (!this.dispatching) return;
		await new Promise<void>((resolve) => this.idleWaiters.push(resolve));
	}

	/**
	 * Starts dispatching unless it is already running, there is no consumer, or
	 * there is nothing queued. Safe to call on every publish.
	 */
	private ensureDispatching(): void {
		if (this.dispatching || !this.handler || this.pending.length === 0) return;
		this.dispatching = true;
		this.dispatchPending().catch((error: unknown) => {
			console.error('engine: work queue dispatch failed', error);
		});
	}

	private async dispatchPending(): Promise<void> {
		try {
			while (this.handler && this.pending.length > 0) {
				const [message] = this.pending.splice(0, 1);
				try {
					await this.handler(message);
				} catch (error) {
					// Contained per message: a failed one must not strand those behind it.
					console.error('engine: work queue handler failed', error);
				}
			}
		} finally {
			this.dispatching = false;
			const waiters = this.idleWaiters;
			this.idleWaiters = [];
			for (const resolve of waiters) resolve();
		}
	}
}
