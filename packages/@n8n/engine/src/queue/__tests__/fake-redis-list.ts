import { vi } from 'vitest';

import type {
	ClosableWorkQueueConsumerClient,
	WorkQueuePublisherClient,
} from '../redis-work-queue';

/**
 * One Redis list. LPUSH adds at the head, RPUSH at the tail, and BRPOP takes
 * from the tail, so `items` reads head to tail.
 */
export class FakeRedisList implements WorkQueuePublisherClient, ClosableWorkQueueConsumerClient {
	readonly items: string[] = [];

	private wakeWaiter: (() => void) | undefined;

	lpush = vi.fn(async (_key: string, value: string) => {
		this.items.unshift(value);
		this.wake();
		return this.items.length;
	});

	rpush = vi.fn(async (_key: string, value: string) => {
		this.items.push(value);
		this.wake();
		return this.items.length;
	});

	brpop = vi.fn(async (key: string, timeoutSeconds: number): Promise<[string, string] | null> => {
		if (this.items.length === 0) {
			await new Promise<void>((resolve) => {
				const timer = setTimeout(resolve, timeoutSeconds * 1000);
				this.wakeWaiter = () => {
					clearTimeout(timer);
					resolve();
				};
			});
		}
		const value = this.items.pop();
		return value === undefined ? null : [key, value];
	});

	disconnect = vi.fn();

	private wake() {
		const waiter = this.wakeWaiter;
		this.wakeWaiter = undefined;
		waiter?.();
	}
}
