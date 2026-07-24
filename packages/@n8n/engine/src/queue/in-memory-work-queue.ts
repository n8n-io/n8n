import type { WorkQueue } from './work-queue.types';

/**
 * In-memory `WorkQueue` — the default until a Redis-backed impl lands. When a
 * handler is registered it dispatches messages sequentially on a microtask.
 *
 * `messages` records everything published so tests can assert on it; `drain()`
 * resolves once the queue has been fully processed.
 */
export class InMemoryWorkQueue<TMessage> implements WorkQueue<TMessage> {
	readonly messages: TMessage[] = [];

	private pending: TMessage[] = [];

	private handler: ((message: TMessage) => Promise<void>) | undefined;

	private processing = false;

	private idleWaiters: Array<() => void> = [];

	// eslint-disable-next-line @typescript-eslint/require-await -- satisfies async interface; dispatch is scheduled, not awaited
	async publish(message: TMessage): Promise<void> {
		this.messages.push(message);
		this.pending.push(message);
		this.pump();
	}

	start(handler: (message: TMessage) => Promise<void>): void {
		this.handler = handler;
		this.pump();
	}

	async stop(): Promise<void> {
		this.handler = undefined;
		await this.drain();
	}

	/** Resolves once all currently-queued messages have been processed. */
	async drain(): Promise<void> {
		if (!this.processing && this.pending.length === 0) return;
		await new Promise<void>((resolve) => this.idleWaiters.push(resolve));
	}

	private pump(): void {
		if (this.processing || !this.handler || this.pending.length === 0) return;
		this.processing = true;
		this.loop().catch((error: unknown) => {
			console.error('engine: work queue handler failed', error);
		});
	}

	private async loop(): Promise<void> {
		try {
			while (this.handler && this.pending.length > 0) {
				const message = this.pending.shift();
				if (message === undefined) break;
				await this.handler(message);
			}
		} finally {
			this.processing = false;
			const waiters = this.idleWaiters;
			this.idleWaiters = [];
			for (const resolve of waiters) resolve();
		}
	}
}
