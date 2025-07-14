import { Service } from '@n8n/di';

import { TypedEmitter } from '@/typed-emitter';

type ConcurrencyEvents = {
	'execution-throttled': { executionId: string };
	'execution-released': string;
	'concurrency-check': { capacity: number };
};

@Service()
export class ConcurrencyQueue extends TypedEmitter<ConcurrencyEvents> {
	private readonly queue: Array<{
		executionId: string;
		resolve: () => void;
	}> = [];

	constructor(private capacity: number) {
		super();
	}

	async enqueue(executionId: string) {
		this.capacity--;

		this.debouncedEmit('concurrency-check', { capacity: this.capacity });

		if (this.capacity < 0) {
			this.emit('execution-throttled', { executionId });

			// eslint-disable-next-line @typescript-eslint/return-await
			return new Promise<void>((resolve) => this.queue.push({ executionId, resolve }));
		}
	}

	get currentCapacity() {
		return this.capacity;
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
		return new Set(this.queue.map((item) => item.executionId));
	}

	has(executionId: string) {
		return this.queue.some((item) => item.executionId === executionId);
	}

	private resolveNext() {
		const item = this.queue.shift();

		if (!item) return;

		const { resolve, executionId } = item;

		this.emit('execution-released', executionId);

		resolve();
	}
}
