import type { WorkQueue, WorkQueueMessage } from './work-queue.types';

/**
 * Default `WorkQueue` impl: appends published messages to an in-memory array.
 * Useful for tests and as the default until a Redis-backed impl lands.
 *
 * `messages` is exposed deliberately so tests can assert on what was
 * published without any extra wiring.
 */
export class InMemoryWorkQueue implements WorkQueue {
	readonly messages: WorkQueueMessage[] = [];

	// eslint-disable-next-line @typescript-eslint/require-await -- satisfies async interface; impl has no async work
	async publish(message: WorkQueueMessage): Promise<void> {
		this.messages.push(message);
	}
}
