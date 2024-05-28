import { Service } from 'typedi';
import { EventEmitter } from 'node:events';
import type { ConcurrencyQueueItem, Ids } from './concurrency.types';

@Service()
export class ConcurrencyQueue extends EventEmitter {
	private readonly queue: ConcurrencyQueueItem[] = [];

	constructor(private capacity: number) {
		super();
	}

	async enqueue(ids: Ids) {
		this.capacity--;

		if (this.capacity < 0) {
			this.emit('execution-throttled', ids);

			// eslint-disable-next-line @typescript-eslint/return-await
			return new Promise<void>((resolve) => this.queue.push({ ...ids, resolve }));
		}
	}

	dequeue() {
		this.capacity++;

		this.resolveNext();
	}

	remove(executionId: string) {
		const index = this.queue.findIndex((item) => item.executionId === executionId);

		if (index > -1) {
			this.queue.splice(index, 1);

			this.capacity++;

			this.resolveNext();
		}
	}

	getAll() {
		return new Set(...this.queue.map((item) => item.executionId));
	}

	private resolveNext() {
		const execution = this.queue.shift();

		if (!execution) return;

		const { resolve, ...ids } = execution;

		this.emit('execution-released', ids);

		resolve();
	}
}
