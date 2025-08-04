import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { ApplicationError } from 'n8n-workflow';
import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface PythonWorker {
	id: string;
	process: ChildProcess;
	busy: boolean;
	created: Date;
	lastUsed: Date;
	executionCount: number;
	packages: string[];
	venvPath: string;
}

interface PooledExecutionOptions {
	code: string;
	context: Record<string, any>;
	timeout?: number;
	packages?: string[];
	priority?: 'low' | 'normal' | 'high';
}

interface PooledExecutionResult {
	result: any;
	stdout: string;
	stderr: string;
	executionTime: number;
	workerId: string;
}

interface PoolConfiguration {
	minWorkers: number;
	maxWorkers: number;
	maxIdleTime: number; // milliseconds
	maxExecutionsPerWorker: number;
	workerStartupTimeout: number;
	healthCheckInterval: number;
}

@Service()
export class PythonPoolService extends EventEmitter {
	private readonly workers = new Map<string, PythonWorker>();
	private readonly executionQueue: Array<{
		id: string;
		options: PooledExecutionOptions;
		resolve: (result: PooledExecutionResult) => void;
		reject: (error: Error) => void;
		queuedAt: Date;
		priority: 'low' | 'normal' | 'high';
	}> = [];

	private readonly config: PoolConfiguration;
	private healthCheckTimer?: NodeJS.Timeout;
	private isShuttingDown = false;

	constructor(private readonly logger: Logger) {
		super();

		this.config = {
			minWorkers: parseInt(process.env.N8N_PYTHON_POOL_MIN_WORKERS || '2', 10),
			maxWorkers: parseInt(process.env.N8N_PYTHON_POOL_MAX_WORKERS || '8', 10),
			maxIdleTime: parseInt(process.env.N8N_PYTHON_POOL_MAX_IDLE_TIME || '300000', 10), // 5 minutes
			maxExecutionsPerWorker: parseInt(process.env.N8N_PYTHON_POOL_MAX_EXECUTIONS || '100', 10),
			workerStartupTimeout: parseInt(process.env.N8N_PYTHON_POOL_STARTUP_TIMEOUT || '30000', 10),
			healthCheckInterval: parseInt(
				process.env.N8N_PYTHON_POOL_HEALTH_CHECK_INTERVAL || '60000',
				10,
			), // 1 minute
		};

		this.logger.info('Python Pool Service initialized', {
			config: this.config,
		});

		this.startHealthCheck();
		this.initializePool();
	}

	/**
	 * Execute Python code using the worker pool
	 */
	async executeCode(options: PooledExecutionOptions): Promise<PooledExecutionResult> {
		if (this.isShuttingDown) {
			throw new ApplicationError('Python pool is shutting down');
		}

		const executionId = randomUUID();
		const priority = options.priority || 'normal';

		this.logger.debug('Queuing Python execution', {
			executionId,
			priority,
			queueSize: this.executionQueue.length,
			availableWorkers: this.getAvailableWorkerCount(),
		});

		return new Promise((resolve, reject) => {
			// Add to execution queue
			this.executionQueue.push({
				id: executionId,
				options,
				resolve,
				reject,
				queuedAt: new Date(),
				priority,
			});

			// Sort queue by priority (high > normal > low)
			this.executionQueue.sort((a, b) => {
				const priorityWeight = { high: 3, normal: 2, low: 1 };
				return priorityWeight[b.priority] - priorityWeight[a.priority];
			});

			// Try to process the queue
			this.processQueue();
		});
	}

	/**
	 * Process the execution queue
	 */
	private async processQueue(): Promise<void> {
		if (this.executionQueue.length === 0) {
			return;
		}

		// Find available worker or create new one
		let worker = this.findAvailableWorker();

		if (!worker && this.workers.size < this.config.maxWorkers) {
			// Create new worker if we haven't reached the limit
			try {
				worker = await this.createWorker([]);
			} catch (error) {
				this.logger.error('Failed to create new worker', { error });
				return;
			}
		}

		if (worker) {
			const execution = this.executionQueue.shift();
			if (execution) {
				this.executeOnWorker(worker, execution);
			}
		}

		// Continue processing if there are more items in queue
		if (this.executionQueue.length > 0) {
			// Use setImmediate to prevent blocking
			setImmediate(() => this.processQueue());
		}
	}

	/**
	 * Execute code on a specific worker
	 */
	private async executeOnWorker(
		worker: PythonWorker,
		execution: {
			id: string;
			options: PooledExecutionOptions;
			resolve: (result: PooledExecutionResult) => void;
			reject: (error: Error) => void;
			queuedAt: Date;
		},
	): Promise<void> {
		worker.busy = true;
		worker.lastUsed = new Date();
		worker.executionCount++;

		const startTime = Date.now();
		const timeout = execution.options.timeout || 30000;

		this.logger.debug('Executing Python code on worker', {
			executionId: execution.id,
			workerId: worker.id,
			queueTime: startTime - execution.queuedAt.getTime(),
		});

		try {
			// Send execution request to worker
			const message = {
				type: 'execute',
				id: execution.id,
				code: execution.options.code,
				context: execution.options.context || {},
				packages: execution.options.packages || [],
			};

			// Set up timeout
			const timeoutHandle = setTimeout(() => {
				execution.reject(new ApplicationError(`Python execution timed out after ${timeout}ms`));
				this.handleWorkerTimeout(worker);
			}, timeout);

			// Set up result handler
			const resultHandler = (data: any) => {
				if (data.id === execution.id) {
					clearTimeout(timeoutHandle);
					worker.process.off('message', resultHandler);
					worker.busy = false;

					const executionTime = Date.now() - startTime;

					if (data.error) {
						execution.reject(
							new ApplicationError(data.error.message, {
								extra: { ...data.error, workerId: worker.id, executionTime },
							}),
						);
					} else {
						execution.resolve({
							result: data.result,
							stdout: data.stdout || '',
							stderr: data.stderr || '',
							executionTime,
							workerId: worker.id,
						});
					}

					// Check if worker needs recycling
					if (worker.executionCount >= this.config.maxExecutionsPerWorker) {
						this.recycleWorker(worker);
					} else {
						// Process next item in queue
						this.processQueue();
					}
				}
			};

			worker.process.on('message', resultHandler);
			worker.process.send(message);
		} catch (error) {
			worker.busy = false;
			execution.reject(
				new ApplicationError('Failed to execute on worker', {
					cause: error,
					extra: { workerId: worker.id },
				}),
			);

			// Remove failed worker
			this.removeWorker(worker);
		}
	}

	/**
	 * Find an available worker that matches the package requirements
	 */
	private findAvailableWorker(): PythonWorker | null {
		for (const worker of this.workers.values()) {
			if (!worker.busy && !this.isWorkerExpired(worker)) {
				return worker;
			}
		}
		return null;
	}

	/**
	 * Create a new Python worker process
	 */
	private async createWorker(packages: string[]): Promise<PythonWorker> {
		const workerId = randomUUID();
		const venvPath = join(process.cwd(), '.venvs', `pool_${workerId}`);

		this.logger.info('Creating new Python worker', { workerId, packages });

		try {
			// Create the worker process
			const workerScript = join(__dirname, '../../../../docker/python-executor/pool-worker.py');
			const process = spawn('python3', [workerScript, venvPath], {
				stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
				env: {
					...process.env,
					N8N_PYTHON_WORKER_ID: workerId,
					N8N_PYTHON_PACKAGES: packages.join(','),
				},
			});

			const worker: PythonWorker = {
				id: workerId,
				process,
				busy: false,
				created: new Date(),
				lastUsed: new Date(),
				executionCount: 0,
				packages: [...packages],
				venvPath,
			};

			// Set up process event handlers
			this.setupWorkerEventHandlers(worker);

			// Wait for worker to be ready
			await this.waitForWorkerReady(worker);

			this.workers.set(workerId, worker);

			this.logger.info('Python worker created successfully', {
				workerId,
				totalWorkers: this.workers.size,
			});

			this.emit('workerCreated', { workerId, packages });

			return worker;
		} catch (error) {
			this.logger.error('Failed to create Python worker', {
				workerId,
				packages,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError('Failed to create Python worker', { cause: error });
		}
	}

	/**
	 * Set up event handlers for a worker process
	 */
	private setupWorkerEventHandlers(worker: PythonWorker): void {
		worker.process.on('error', (error) => {
			this.logger.error('Python worker process error', {
				workerId: worker.id,
				error: error.message,
			});
			this.removeWorker(worker);
		});

		worker.process.on('exit', (code, signal) => {
			this.logger.warn('Python worker process exited', {
				workerId: worker.id,
				code,
				signal,
			});
			this.removeWorker(worker);
		});

		worker.process.stdout?.on('data', (data) => {
			this.logger.debug('Worker stdout', {
				workerId: worker.id,
				data: data.toString(),
			});
		});

		worker.process.stderr?.on('data', (data) => {
			this.logger.warn('Worker stderr', {
				workerId: worker.id,
				data: data.toString(),
			});
		});
	}

	/**
	 * Wait for worker to signal it's ready
	 */
	private async waitForWorkerReady(worker: PythonWorker): Promise<void> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new ApplicationError(`Worker ${worker.id} failed to start within timeout`));
			}, this.config.workerStartupTimeout);

			const readyHandler = (message: any) => {
				if (message.type === 'ready') {
					clearTimeout(timeout);
					worker.process.off('message', readyHandler);
					resolve();
				}
			};

			worker.process.on('message', readyHandler);
		});
	}

	/**
	 * Initialize the worker pool with minimum workers
	 */
	private async initializePool(): Promise<void> {
		this.logger.info('Initializing Python worker pool', {
			minWorkers: this.config.minWorkers,
		});

		const initPromises = [];
		for (let i = 0; i < this.config.minWorkers; i++) {
			initPromises.push(this.createWorker([]));
		}

		try {
			await Promise.all(initPromises);
			this.logger.info('Python worker pool initialized successfully');
		} catch (error) {
			this.logger.error('Failed to initialize Python worker pool', { error });
		}
	}

	/**
	 * Check if a worker has expired (idle too long)
	 */
	private isWorkerExpired(worker: PythonWorker): boolean {
		const idleTime = Date.now() - worker.lastUsed.getTime();
		return idleTime > this.config.maxIdleTime;
	}

	/**
	 * Start health check timer
	 */
	private startHealthCheck(): void {
		this.healthCheckTimer = setInterval(() => {
			this.performHealthCheck();
		}, this.config.healthCheckInterval);
	}

	/**
	 * Perform health check on all workers
	 */
	private performHealthCheck(): void {
		const expiredWorkers = [];

		for (const worker of this.workers.values()) {
			if (!worker.busy && this.isWorkerExpired(worker)) {
				expiredWorkers.push(worker);
			}
		}

		// Remove expired workers
		for (const worker of expiredWorkers) {
			this.removeWorker(worker);
		}

		// Ensure minimum worker count
		const currentWorkers = this.workers.size;
		if (currentWorkers < this.config.minWorkers) {
			const workersToCreate = this.config.minWorkers - currentWorkers;
			for (let i = 0; i < workersToCreate; i++) {
				this.createWorker([]).catch((error) => {
					this.logger.error('Failed to create worker during health check', { error });
				});
			}
		}

		this.emit('healthCheck', {
			totalWorkers: this.workers.size,
			busyWorkers: this.getBusyWorkerCount(),
			queueSize: this.executionQueue.length,
		});
	}

	/**
	 * Handle worker timeout
	 */
	private handleWorkerTimeout(worker: PythonWorker): void {
		this.logger.warn('Worker execution timed out', { workerId: worker.id });
		this.removeWorker(worker);
	}

	/**
	 * Recycle a worker (remove and create new one)
	 */
	private recycleWorker(worker: PythonWorker): void {
		this.logger.info('Recycling Python worker', {
			workerId: worker.id,
			executionCount: worker.executionCount,
		});

		this.removeWorker(worker);

		// Create replacement worker
		this.createWorker(worker.packages).catch((error) => {
			this.logger.error('Failed to create replacement worker', { error });
		});
	}

	/**
	 * Remove a worker from the pool
	 */
	private removeWorker(worker: PythonWorker): void {
		try {
			worker.process.kill('SIGTERM');
		} catch (error) {
			this.logger.warn('Failed to terminate worker process', {
				workerId: worker.id,
				error,
			});
		}

		this.workers.delete(worker.id);
		this.emit('workerRemoved', { workerId: worker.id });

		this.logger.info('Python worker removed', {
			workerId: worker.id,
			remainingWorkers: this.workers.size,
		});
	}

	/**
	 * Get the number of available workers
	 */
	private getAvailableWorkerCount(): number {
		return Array.from(this.workers.values()).filter((w) => !w.busy).length;
	}

	/**
	 * Get the number of busy workers
	 */
	private getBusyWorkerCount(): number {
		return Array.from(this.workers.values()).filter((w) => w.busy).length;
	}

	/**
	 * Get pool statistics
	 */
	getPoolStats(): {
		totalWorkers: number;
		busyWorkers: number;
		availableWorkers: number;
		queueSize: number;
		totalExecutions: number;
		config: PoolConfiguration;
	} {
		const totalExecutions = Array.from(this.workers.values()).reduce(
			(sum, worker) => sum + worker.executionCount,
			0,
		);

		return {
			totalWorkers: this.workers.size,
			busyWorkers: this.getBusyWorkerCount(),
			availableWorkers: this.getAvailableWorkerCount(),
			queueSize: this.executionQueue.length,
			totalExecutions,
			config: this.config,
		};
	}

	/**
	 * Graceful shutdown of the pool
	 */
	async shutdown(): Promise<void> {
		this.isShuttingDown = true;

		this.logger.info('Shutting down Python worker pool');

		// Stop health check
		if (this.healthCheckTimer) {
			clearInterval(this.healthCheckTimer);
		}

		// Reject queued executions
		for (const execution of this.executionQueue) {
			execution.reject(new ApplicationError('Python pool is shutting down'));
		}
		this.executionQueue.length = 0;

		// Terminate all workers
		const shutdownPromises = Array.from(this.workers.values()).map((worker) => {
			return new Promise<void>((resolve) => {
				worker.process.on('exit', () => resolve());
				worker.process.kill('SIGTERM');

				// Force kill after timeout
				setTimeout(() => {
					try {
						worker.process.kill('SIGKILL');
					} catch (error) {
						// Process already dead
					}
					resolve();
				}, 5000);
			});
		});

		await Promise.all(shutdownPromises);
		this.workers.clear();

		this.logger.info('Python worker pool shutdown complete');
	}
}
