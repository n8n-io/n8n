import type { Logger } from '@/Logger';
import type { Push } from '@/push';
import { Service } from 'typedi';

@Service()
export class ConcurrencyQueue {
	private readonly queue: Array<[executionId: string, resolve: () => void]> = [];

	private capacity: number;

	private readonly kind: 'manual' | 'production';

	private readonly logger: Logger;

	private readonly push: Push;

	constructor({
		capacity,
		kind,
		logger, // @TODO: Inject via typedi?
		push, // @TODO: Inject via typedi?
	}: {
		capacity: number;
		kind: 'manual' | 'production';
		logger: Logger;
		push: Push;
	}) {
		this.capacity = capacity;
		this.kind = kind;
		this.logger = logger;
		this.push = push;
	}

	async enqueue(executionId: string) {
		this.capacity--;

		if (this.capacity < 0) {
			this.logger.info('[Concurrency Control] Throttled execution due to concurrency cap', {
				executionId,
				capacity: this.capacity,
				kind: this.kind,
			});

			if (this.kind === 'manual') this.push.broadcast('executionThrottled');

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

		if (this.kind === 'manual') this.push.broadcast('executionReleased');

		resolve();
	}
}
