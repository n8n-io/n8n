import { Service } from 'typedi';
import { EventEmitter } from 'node:events';

@Service()
export class ConcurrencyQueue extends EventEmitter {
	private readonly queue: Array<[executionId: string, resolve: () => void]> = [];

	private capacity: number;

	private readonly kind: 'manual' | 'production';

	constructor({ capacity, kind }: { capacity: number; kind: 'manual' | 'production' }) {
		super();

		this.capacity = capacity;
		this.kind = kind;
	}

	async enqueue(executionId: string) {
		this.capacity--;

		if (this.capacity < 0) {
			this.emit('execution-throttled', { executionId, capacity: this.capacity, kind: this.kind });

			// eslint-disable-next-line @typescript-eslint/return-await
			return new Promise<void>((resolve) => this.queue.push([executionId, resolve]));
		}
	}

	dequeue() {
		this.capacity++;

		if (this.capacity > 0) this.resolveNext();
	}

	remove(executionId: string) {
		const index = this.queue.findIndex((item) => item[0] === executionId);

		if (index > -1) {
			this.queue.splice(index, 1);

			this.capacity++;

			if (this.capacity > 0) this.resolveNext();
		}
	}

	getAll() {
		return new Set(...this.queue.map((item) => item[0]));
	}

	private resolveNext() {
		const execution = this.queue.shift();

		if (!execution) return;

		const [executionId, resolve] = execution;

		this.emit('execution-released', { executionId, capacity: this.capacity, kind: this.kind });

		resolve();
	}
}
