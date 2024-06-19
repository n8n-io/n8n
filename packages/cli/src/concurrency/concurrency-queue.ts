import { Service } from 'typedi';
import { EventEmitter } from 'node:events';

@Service()
export class ConcurrencyQueue extends EventEmitter {
	private readonly queue: Array<{
		executionId: string;
		resolve: () => void;
	}> = [];

	constructor(private capacity: number) {
		super();
	}

	async enqueue(executionId: string) {
		this.capacity--;

		if (this.capacity < 0) {
			this.emit('execution-throttled', { executionId, capacity: this.capacity });

			// eslint-disable-next-line @typescript-eslint/return-await
			return new Promise<void>((resolve) => this.queue.push({ executionId, resolve }));
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
		const item = this.queue.shift();

		if (!item) return;

		const { resolve, executionId } = item;

		this.emit('execution-released', executionId);

		resolve();
	}
}
