export class ConcurrencyQueue {
	private readonly enqueued: Array<[executionId: string, resolveFn: () => void]> = [];

	constructor(private capacity: number) {}

	/** Prevent executions from starting if the max concurrency has exceeded */
	async enqueue(executionId: string) {
		this.capacity--;
		if (this.capacity < 0) {
			// eslint-disable-next-line @typescript-eslint/return-await
			return new Promise<void>((resolve) => this.enqueued.push([executionId, resolve]));
		}
	}

	/** Release capacity back, and resume the next execution (if any) */
	dequeue(): void {
		this.capacity++;
		if (this.capacity > 0) {
			this.resumeNext();
		}
	}

	/** Remove an execution from the queue, irrespective of it's execution status */
	remove(executionId: string) {
		const index = this.enqueued.findIndex((item) => item[0] === executionId);
		if (index > -1) {
			this.enqueued.splice(index, 1);
			this.capacity++;
			if (this.capacity > 0) {
				this.resumeNext();
			}
		}
	}

	private resumeNext() {
		this.enqueued.shift()?.[1]();
	}
}
