'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.PythonPoolService = void 0;
const di_1 = require('@n8n/di');
const backend_common_1 = require('@n8n/backend-common');
const n8n_workflow_1 = require('n8n-workflow');
const events_1 = require('events');
const child_process_1 = require('child_process');
const path_1 = require('path');
const crypto_1 = require('crypto');
let PythonPoolService = class PythonPoolService extends events_1.EventEmitter {
	constructor(logger) {
		super();
		this.logger = logger;
		this.workers = new Map();
		this.executionQueue = [];
		this.isShuttingDown = false;
		this.config = {
			minWorkers: parseInt(process.env.N8N_PYTHON_POOL_MIN_WORKERS || '2', 10),
			maxWorkers: parseInt(process.env.N8N_PYTHON_POOL_MAX_WORKERS || '8', 10),
			maxIdleTime: parseInt(process.env.N8N_PYTHON_POOL_MAX_IDLE_TIME || '300000', 10),
			maxExecutionsPerWorker: parseInt(process.env.N8N_PYTHON_POOL_MAX_EXECUTIONS || '100', 10),
			workerStartupTimeout: parseInt(process.env.N8N_PYTHON_POOL_STARTUP_TIMEOUT || '30000', 10),
			healthCheckInterval: parseInt(
				process.env.N8N_PYTHON_POOL_HEALTH_CHECK_INTERVAL || '60000',
				10,
			),
		};
		this.logger.info('Python Pool Service initialized', {
			config: this.config,
		});
		this.startHealthCheck();
		this.initializePool();
	}
	async executeCode(options) {
		if (this.isShuttingDown) {
			throw new n8n_workflow_1.ApplicationError('Python pool is shutting down');
		}
		const executionId = (0, crypto_1.randomUUID)();
		const priority = options.priority || 'normal';
		this.logger.debug('Queuing Python execution', {
			executionId,
			priority,
			queueSize: this.executionQueue.length,
			availableWorkers: this.getAvailableWorkerCount(),
		});
		return new Promise((resolve, reject) => {
			this.executionQueue.push({
				id: executionId,
				options,
				resolve,
				reject,
				queuedAt: new Date(),
				priority,
			});
			this.executionQueue.sort((a, b) => {
				const priorityWeight = { high: 3, normal: 2, low: 1 };
				return priorityWeight[b.priority] - priorityWeight[a.priority];
			});
			this.processQueue();
		});
	}
	async processQueue() {
		if (this.executionQueue.length === 0) {
			return;
		}
		let worker = this.findAvailableWorker();
		if (!worker && this.workers.size < this.config.maxWorkers) {
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
		if (this.executionQueue.length > 0) {
			setImmediate(() => this.processQueue());
		}
	}
	async executeOnWorker(worker, execution) {
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
			const message = {
				type: 'execute',
				id: execution.id,
				code: execution.options.code,
				context: execution.options.context || {},
				packages: execution.options.packages || [],
			};
			const timeoutHandle = setTimeout(() => {
				execution.reject(
					new n8n_workflow_1.ApplicationError(`Python execution timed out after ${timeout}ms`),
				);
				this.handleWorkerTimeout(worker);
			}, timeout);
			const resultHandler = (data) => {
				if (data.id === execution.id) {
					clearTimeout(timeoutHandle);
					worker.process.off('message', resultHandler);
					worker.busy = false;
					const executionTime = Date.now() - startTime;
					if (data.error) {
						execution.reject(
							new n8n_workflow_1.ApplicationError(data.error.message, {
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
					if (worker.executionCount >= this.config.maxExecutionsPerWorker) {
						this.recycleWorker(worker);
					} else {
						this.processQueue();
					}
				}
			};
			worker.process.on('message', resultHandler);
			worker.process.send(message);
		} catch (error) {
			worker.busy = false;
			execution.reject(
				new n8n_workflow_1.ApplicationError('Failed to execute on worker', {
					cause: error,
					extra: { workerId: worker.id },
				}),
			);
			this.removeWorker(worker);
		}
	}
	findAvailableWorker() {
		for (const worker of this.workers.values()) {
			if (!worker.busy && !this.isWorkerExpired(worker)) {
				return worker;
			}
		}
		return null;
	}
	async createWorker(packages) {
		const workerId = (0, crypto_1.randomUUID)();
		const venvPath = (0, path_1.join)(process.cwd(), '.venvs', `pool_${workerId}`);
		this.logger.info('Creating new Python worker', { workerId, packages });
		try {
			const workerScript = (0, path_1.join)(
				__dirname,
				'../../../../docker/python-executor/pool-worker.py',
			);
			const process = (0, child_process_1.spawn)('python3', [workerScript, venvPath], {
				stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
				env: {
					...process.env,
					N8N_PYTHON_WORKER_ID: workerId,
					N8N_PYTHON_PACKAGES: packages.join(','),
				},
			});
			const worker = {
				id: workerId,
				process,
				busy: false,
				created: new Date(),
				lastUsed: new Date(),
				executionCount: 0,
				packages: [...packages],
				venvPath,
			};
			this.setupWorkerEventHandlers(worker);
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
			throw new n8n_workflow_1.ApplicationError('Failed to create Python worker', { cause: error });
		}
	}
	setupWorkerEventHandlers(worker) {
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
	async waitForWorkerReady(worker) {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(
					new n8n_workflow_1.ApplicationError(`Worker ${worker.id} failed to start within timeout`),
				);
			}, this.config.workerStartupTimeout);
			const readyHandler = (message) => {
				if (message.type === 'ready') {
					clearTimeout(timeout);
					worker.process.off('message', readyHandler);
					resolve();
				}
			};
			worker.process.on('message', readyHandler);
		});
	}
	async initializePool() {
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
	isWorkerExpired(worker) {
		const idleTime = Date.now() - worker.lastUsed.getTime();
		return idleTime > this.config.maxIdleTime;
	}
	startHealthCheck() {
		this.healthCheckTimer = setInterval(() => {
			this.performHealthCheck();
		}, this.config.healthCheckInterval);
	}
	performHealthCheck() {
		const expiredWorkers = [];
		for (const worker of this.workers.values()) {
			if (!worker.busy && this.isWorkerExpired(worker)) {
				expiredWorkers.push(worker);
			}
		}
		for (const worker of expiredWorkers) {
			this.removeWorker(worker);
		}
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
	handleWorkerTimeout(worker) {
		this.logger.warn('Worker execution timed out', { workerId: worker.id });
		this.removeWorker(worker);
	}
	recycleWorker(worker) {
		this.logger.info('Recycling Python worker', {
			workerId: worker.id,
			executionCount: worker.executionCount,
		});
		this.removeWorker(worker);
		this.createWorker(worker.packages).catch((error) => {
			this.logger.error('Failed to create replacement worker', { error });
		});
	}
	removeWorker(worker) {
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
	getAvailableWorkerCount() {
		return Array.from(this.workers.values()).filter((w) => !w.busy).length;
	}
	getBusyWorkerCount() {
		return Array.from(this.workers.values()).filter((w) => w.busy).length;
	}
	getPoolStats() {
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
	async shutdown() {
		this.isShuttingDown = true;
		this.logger.info('Shutting down Python worker pool');
		if (this.healthCheckTimer) {
			clearInterval(this.healthCheckTimer);
		}
		for (const execution of this.executionQueue) {
			execution.reject(new n8n_workflow_1.ApplicationError('Python pool is shutting down'));
		}
		this.executionQueue.length = 0;
		const shutdownPromises = Array.from(this.workers.values()).map((worker) => {
			return new Promise((resolve) => {
				worker.process.on('exit', () => resolve());
				worker.process.kill('SIGTERM');
				setTimeout(() => {
					try {
						worker.process.kill('SIGKILL');
					} catch (error) {}
					resolve();
				}, 5000);
			});
		});
		await Promise.all(shutdownPromises);
		this.workers.clear();
		this.logger.info('Python worker pool shutdown complete');
	}
};
exports.PythonPoolService = PythonPoolService;
exports.PythonPoolService = PythonPoolService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	PythonPoolService,
);
//# sourceMappingURL=python-pool.service.js.map
