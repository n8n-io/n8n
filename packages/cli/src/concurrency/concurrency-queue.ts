import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ManualExecutionCancelledError } from 'n8n-workflow';

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
		reject: (err: Error) => void;
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
			return new Promise<void>((resolve, reject) =>
				this.queue.push({ executionId, resolve, reject }),
			);
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
			const item = this.queue[index];
			this.queue.splice(index, 1);

			this.capacity++;

			item.reject(new ManualExecutionCancelledError(executionId));
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
