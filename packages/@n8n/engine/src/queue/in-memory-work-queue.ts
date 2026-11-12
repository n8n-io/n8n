import { UnexpectedError } from '../common';
import { createConsoleLogger, type EngineLogger } from '../logging';
import type { WorkQueue } from './work-queue.types';

/**
 * In-memory `WorkQueue`. When a handler is registered, it runs up to
 * `concurrency` messages at once and starts them in the order they were
 * published.
 */
export class InMemoryWorkQueue<TMessage> implements WorkQueue<TMessage> {
	private readonly concurrency: number;

	constructor(
		private readonly logger: EngineLogger = createConsoleLogger(),
		{ concurrency = 1 }: { concurrency?: number } = {},
	) {
		if (!Number.isInteger(concurrency) || concurrency < 1) {
			throw new UnexpectedError(
				`work queue concurrency is ${concurrency}; it must be a positive integer`,
			);
		}
		this.concurrency = concurrency;
	}

	private pending: TMessage[] = [];

	private handler: ((message: TMessage) => Promise<void>) | undefined;

	private inFlight = 0;

	private idleWaiters: Array<() => void> = [];

	// eslint-disable-next-line @typescript-eslint/require-await -- satisfies async interface; dispatch is scheduled, not awaited
	async publish(message: TMessage): Promise<void> {
		this.pending.push(message);
		this.fillSlots();
	}

	start(handler: (message: TMessage) => Promise<void>): void {
		this.handler = handler;
		this.fillSlots();
	}

	async stop(): Promise<void> {
		this.handler = undefined;
		// Only in-flight work is awaited; anything still queued has no consumer to
		// dispatch it, so waiting on it would never return.
		if (this.inFlight === 0) return;
		await new Promise<void>((resolve) => this.idleWaiters.push(resolve));
	}

	/** Starts queued messages until every slot is busy. Safe to call on every publish. */
	private fillSlots(): void {
		while (this.handler && this.inFlight < this.concurrency && this.pending.length > 0) {
			const [message] = this.pending.splice(0, 1);
			this.inFlight += 1;
			void this.run(this.handler, message);
		}
	}

	private async run(handler: (message: TMessage) => Promise<void>, message: TMessage) {
		try {
			await handler(message);
		} catch (error) {
			// Contained per message: a failed one must not strand those behind it.
			this.logger.error('work queue handler failed', { error });
		} finally {
			this.inFlight -= 1;
			this.fillSlots();
			if (this.inFlight === 0) this.resolveIdleWaiters();
		}
	}

	private resolveIdleWaiters(): void {
		const waiters = this.idleWaiters;
		this.idleWaiters = [];
		for (const resolve of waiters) resolve();
	}
}
