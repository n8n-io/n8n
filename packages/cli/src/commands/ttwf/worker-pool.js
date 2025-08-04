'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkerPool = void 0;
class WorkerPool {
	constructor(maxWorkers) {
		this.maxWorkers = maxWorkers;
		this.queue = [];
		this.activeWorkers = 0;
	}
	async execute(task) {
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
	processQueue() {
		if (this.queue.length > 0 && this.activeWorkers < this.maxWorkers) {
			const task = this.queue.shift();
			void this.execute(task);
		}
	}
}
exports.WorkerPool = WorkerPool;
//# sourceMappingURL=worker-pool.js.map
