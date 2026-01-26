import { cpus } from 'os';
import { join } from 'path';
import { Worker } from 'worker_threads';

interface PendingTask {
	resolve: (value: { indices: number[]; scores: number[] }) => void;
	reject: (error: Error) => void;
}

interface Message {
	indices: number[];
	scores: number[];
	taskId: string;
	error?: string;
}

/**
 * Worker pool for offloading vector similarity calculations to worker threads.
 * Prevents blocking the main event loop during CPU-intensive operations.
 */
export class VectorWorkerPool {
	private workers: Worker[] = [];
	private availableWorkers: Worker[] = [];
	private pendingTasks: Array<{
		queryVector: Float32Array;
		vectors: Float32Array[];
		k: number;
		task: PendingTask;
	}> = [];
	private taskMap = new Map<string, PendingTask>();
	private taskIdCounter = 0;
	private isShuttingDown = false;

	constructor(private readonly poolSize: number = Math.max(1, Math.floor(cpus().length / 2))) {
		// Default to half of CPU cores, minimum 1
		this.initializeWorkers();
	}

	private initializeWorkers(): void {
		const workerPath = join(__dirname, 'vector-similarity.worker.js');

		for (let i = 0; i < this.poolSize; i++) {
			const worker = new Worker(workerPath);

			worker.on('message', (message: Message) => {
				this.handleWorkerMessage(worker, message);
			});

			worker.on('error', (error) => {
				this.handleWorkerError(worker, error);
			});

			worker.on('exit', (code) => {
				if (!this.isShuttingDown && code !== 0) {
					// Worker died unexpectedly, replace it
					this.replaceWorker(worker);
				}
			});

			this.workers.push(worker);
			this.availableWorkers.push(worker);
		}
	}

	private handleWorkerMessage(worker: Worker, message: Message): void {
		const { taskId, error } = message;
		const task = this.taskMap.get(taskId);

		if (!task) {
			// Task was already resolved or worker sent stale message
			return;
		}

		this.taskMap.delete(taskId);

		if (error) {
			task.reject(new Error(error));
		} else {
			task.resolve({
				indices: message.indices,
				scores: message.scores,
			});
		}

		// Worker is now available
		this.availableWorkers.push(worker);

		// Process next pending task if any
		this.processNextTask();
	}

	private handleWorkerError(worker: Worker, error: Error): void {
		// Find and reject all tasks assigned to this worker
		for (const [taskId, task] of this.taskMap.entries()) {
			task.reject(new Error(`Worker error: ${error.message}`));
			this.taskMap.delete(taskId);
		}

		// Replace the failed worker
		this.replaceWorker(worker);
	}

	private replaceWorker(oldWorker: Worker): void {
		// Remove from workers array
		const index = this.workers.indexOf(oldWorker);
		if (index > -1) {
			this.workers.splice(index, 1);
		}

		// Remove from available workers
		const availIndex = this.availableWorkers.indexOf(oldWorker);
		if (availIndex > -1) {
			this.availableWorkers.splice(availIndex, 1);
		}

		// Terminate old worker
		void oldWorker.terminate();

		// Create new worker
		const workerPath = join(__dirname, 'vector-similarity.worker.js');
		const newWorker = new Worker(workerPath);

		newWorker.on('message', (message: Message) => {
			this.handleWorkerMessage(newWorker, message);
		});

		newWorker.on('error', (error) => {
			this.handleWorkerError(newWorker, error);
		});

		newWorker.on('exit', (code) => {
			if (!this.isShuttingDown && code !== 0) {
				this.replaceWorker(newWorker);
			}
		});

		this.workers.push(newWorker);
		this.availableWorkers.push(newWorker);
	}

	private processNextTask(): void {
		if (this.pendingTasks.length === 0 || this.availableWorkers.length === 0) {
			return;
		}

		const nextTask = this.pendingTasks.shift()!;
		const worker = this.availableWorkers.pop()!;

		this.executeTask(worker, nextTask.queryVector, nextTask.vectors, nextTask.k, nextTask.task);
	}

	private executeTask(
		worker: Worker,
		queryVector: Float32Array,
		vectors: Float32Array[],
		k: number,
		task: PendingTask,
	): void {
		const taskId = `task_${this.taskIdCounter++}`;
		this.taskMap.set(taskId, task);

		worker.postMessage({
			queryVector,
			vectors,
			k,
			taskId,
		});
	}

	/**
	 * Calculate similarity in a worker thread (non-blocking).
	 *
	 * @param queryVector The query vector to compare against
	 * @param vectors Array of vectors to search
	 * @param k Number of top results to return
	 * @returns Promise resolving to top-K indices and scores
	 */
	async calculateSimilarity(
		queryVector: Float32Array,
		vectors: Float32Array[],
		k: number,
	): Promise<{ indices: number[]; scores: number[] }> {
		return await new Promise((resolve, reject) => {
			const task: PendingTask = { resolve, reject };

			if (this.availableWorkers.length > 0) {
				// Worker available, execute immediately
				const worker = this.availableWorkers.pop()!;
				this.executeTask(worker, queryVector, vectors, k, task);
			} else {
				// No workers available, queue the task
				this.pendingTasks.push({
					queryVector,
					vectors,
					k,
					task,
				});
			}
		});
	}

	/**
	 * Gracefully shutdown all workers.
	 */
	async shutdown(): Promise<void> {
		this.isShuttingDown = true;

		// Reject all pending tasks
		for (const pendingTask of this.pendingTasks) {
			pendingTask.task.reject(new Error('Worker pool is shutting down'));
		}
		this.pendingTasks = [];

		// Reject all in-progress tasks
		for (const [taskId, task] of this.taskMap.entries()) {
			task.reject(new Error('Worker pool is shutting down'));
			this.taskMap.delete(taskId);
		}

		// Terminate all workers
		await Promise.all(this.workers.map(async (worker) => await worker.terminate()));
		this.workers = [];
		this.availableWorkers = [];
	}

	/**
	 * Get pool statistics for monitoring.
	 */
	getStats(): {
		totalWorkers: number;
		availableWorkers: number;
		pendingTasks: number;
		activeTasks: number;
	} {
		return {
			totalWorkers: this.workers.length,
			availableWorkers: this.availableWorkers.length,
			pendingTasks: this.pendingTasks.length,
			activeTasks: this.taskMap.size,
		};
	}
}
