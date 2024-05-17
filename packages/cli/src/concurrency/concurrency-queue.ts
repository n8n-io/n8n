import type { Logger } from '@/Logger';
import { Service } from 'typedi';

@Service()
export class ConcurrencyQueue {
	private readonly queue: Array<[executionId: string, resolve: () => void]> = [];

	private capacity: number;

	private kind: 'manual' | 'production';

	private logger: Logger;

	constructor({
		capacity,
		kind,
		logger,
	}: {
		capacity: number;
		kind: 'manual' | 'production';
		logger: Logger;
	}) {
		this.capacity = capacity;
		this.kind = kind;
		this.logger = logger;
	}

	async enqueue(executionId: string) {
		this.capacity--;

		if (this.capacity < 0) {
			this.logger.info('[Concurrency Control] Throttled execution due to concurrency cap', {
				executionId,
				capacity: this.capacity,
				kind: this.kind,
			});
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
			return true;
		}

		return false;
	}

	getAll() {
		return new Set(...this.queue.map((item) => item[0]));
	}

	private resolveNext() {
		const execution = this.queue.shift();

		if (!execution) return;

		const [_, resolve] = execution;

		resolve();
	}
}
