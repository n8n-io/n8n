export class WorkerPool<T> {
	private queue: Array<() => Promise<T>> = [];

	private activeWorkers = 0;

	constructor(private maxWorkers: number) {}

	async execute(task: () => Promise<T>): Promise<T> {
		// If under limit, execute immediately
		if (this.activeWorkers < this.maxWorkers) {
			this.activeWorkers++;
			try {
				const result = await task();
				this.activeWorkers--;
				this.processQueue();

				return result;
			} catch (error) {
				this.activeWorkers--;
				this.processQueue();

				throw error;
			}
		}

		// Otherwise queue the task
		return await new Promise((resolve, reject) => {
			this.queue.push(async () => {
				try {
					const result = await task();
					resolve(result);
					return result;
				} catch (error) {
					reject(error);
					throw error;
				}
			});
		});
	}

	private processQueue() {
		if (this.queue.length > 0 && this.activeWorkers < this.maxWorkers) {
			const task = this.queue.shift()!;
			void this.execute(task);
		}
	}
}
