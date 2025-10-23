import { fork, type ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import { cpus } from 'os';
import { resolve } from 'path';

interface PooledProcess {
	child: ChildProcess;
	id: string;
	busy: boolean;
	lastUsed: Date;
	currentExecutionId?: string;
	/** Number of times this process has been reused */
	reuseCount: number;
	/** Timestamp when this process was spawned */
	spawnedAt: Date;
}

interface PendingRequest {
	resolve: (process: PooledProcess) => void;
	reject: (error: Error) => void;
	executionId: string;
}

export interface ChildProcessPoolOptions {
	/** Maximum number of child processes. Defaults to CPU count - 1 */
	maxProcesses?: number;
	/** Idle timeout in milliseconds before killing unused processes. Defaults to 30000 (30s) */
	idleTimeout?: number;
	/** Max old generation heap size in MB for child processes. Optional - no limit if not set */
	maxOldGenerationSizeMb?: number;
}

/**
 * Pool manager for reusable child processes
 * Handles spawning, reusing, and cleanup of child processes for workflow execution
 */
export class ChildProcessPool {
	private processes = new Map<string, PooledProcess>();
	private pendingQueue: PendingRequest[] = [];
	private readonly maxProcesses: number;
	private readonly idleTimeout: number;
	private readonly maxOldGenerationSizeMb?: number;
	private cleanupInterval?: NodeJS.Timeout;
	private readonly workerPath: string;

	constructor(options?: ChildProcessPoolOptions) {
		this.maxProcesses = options?.maxProcesses ?? Math.max(1, cpus().length - 1);
		this.idleTimeout = options?.idleTimeout ?? 30000; // 30 seconds
		this.maxOldGenerationSizeMb = options?.maxOldGenerationSizeMb;
		this.workerPath = resolve(__dirname, 'worker-thread.js');

		// Start cleanup interval to kill idle processes
		this.cleanupInterval = setInterval(() => {
			this.cleanupIdleProcesses();
		}, 10000); // Check every 10 seconds

		console.log(
			`[ChildProcessPool] Initialized with max ${this.maxProcesses} processes, idleTimeout ${this.idleTimeout}ms${this.maxOldGenerationSizeMb ? `, heapLimit ${this.maxOldGenerationSizeMb}MB` : ''}`,
		);
	}

	/**
	 * Get an available process from the pool or spawn a new one
	 * Returns a promise that resolves when a process is available
	 */
	async getProcess(executionId: string): Promise<PooledProcess> {
		// First, try to find an idle process
		const idleProcess = this.findIdleProcess();
		if (idleProcess) {
			idleProcess.busy = true;
			idleProcess.currentExecutionId = executionId;
			idleProcess.lastUsed = new Date();
			idleProcess.reuseCount++;
			console.log(
				`[ChildProcessPool] Reusing process ${idleProcess.id} for execution ${executionId} (reuse count: ${idleProcess.reuseCount})`,
			);
			return idleProcess;
		}

		// If we haven't reached max processes, spawn a new one
		if (this.processes.size < this.maxProcesses) {
			const pooledProcess = this.spawnProcess();
			pooledProcess.busy = true;
			pooledProcess.currentExecutionId = executionId;
			pooledProcess.lastUsed = new Date();
			console.log(
				`[ChildProcessPool] Spawned new process ${pooledProcess.id} for execution ${executionId} (${this.processes.size}/${this.maxProcesses})`,
			);
			return pooledProcess;
		}

		// All processes are busy and we're at max capacity, queue the request
		console.log(
			`[ChildProcessPool] All processes busy, queuing execution ${executionId} (queue size: ${this.pendingQueue.length + 1})`,
		);
		return await new Promise<PooledProcess>((resolve, reject) => {
			this.pendingQueue.push({ resolve, reject, executionId });
		});
	}

	/**
	 * Release a process back to the pool after execution completes
	 */
	releaseProcess(processId: string): void {
		const process = this.processes.get(processId);
		if (!process) {
			console.warn(`[ChildProcessPool] Tried to release unknown process ${processId}`);
			return;
		}

		console.log(
			`[ChildProcessPool] Releasing process ${processId} (execution ${process.currentExecutionId})`,
		);
		process.busy = false;
		process.currentExecutionId = undefined;
		process.lastUsed = new Date();

		// If there are pending requests, assign this process to the next one
		if (this.pendingQueue.length > 0) {
			const pending = this.pendingQueue.shift()!;
			process.busy = true;
			process.currentExecutionId = pending.executionId;
			console.log(
				`[ChildProcessPool] Assigning process ${processId} to queued execution ${pending.executionId}`,
			);
			pending.resolve(process);
		}
	}

	/**
	 * Remove a process from the pool (e.g., when it crashes)
	 * Rejects any pending execution that was using this process
	 */
	removeProcess(processId: string, _error?: Error): void {
		const process = this.processes.get(processId);
		if (!process) return;

		console.log(`[ChildProcessPool] Removing process ${processId} from pool`);
		this.processes.delete(processId);

		try {
			if (!process.child.killed) {
				process.child.kill();
			}
		} catch (e) {
			// Process might already be dead
		}
	}

	/**
	 * Get process by ID
	 */
	getProcessById(processId: string): PooledProcess | undefined {
		return this.processes.get(processId);
	}

	/**
	 * Get process by execution ID
	 */
	getProcessByExecutionId(executionId: string): PooledProcess | undefined {
		for (const process of this.processes.values()) {
			if (process.currentExecutionId === executionId) {
				return process;
			}
		}
		return undefined;
	}

	/**
	 * Shutdown the pool and kill all processes
	 */
	shutdown(): void {
		console.log(`[ChildProcessPool] Shutting down pool with ${this.processes.size} processes`);

		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}

		// Reject all pending requests
		for (const pending of this.pendingQueue) {
			pending.reject(new Error('Process pool is shutting down'));
		}
		this.pendingQueue = [];

		// Kill all processes
		for (const [id, process] of this.processes.entries()) {
			try {
				if (!process.child.killed) {
					process.child.kill();
				}
			} catch (e) {
				console.error(`[ChildProcessPool] Error killing process ${id}:`, e);
			}
		}

		this.processes.clear();
	}

	/**
	 * Get pool statistics
	 */
	getStats() {
		const busy = Array.from(this.processes.values()).filter((p) => p.busy).length;
		return {
			total: this.processes.size,
			busy,
			idle: this.processes.size - busy,
			pending: this.pendingQueue.length,
			maxProcesses: this.maxProcesses,
		};
	}

	/**
	 * Find an idle process in the pool
	 */
	private findIdleProcess(): PooledProcess | undefined {
		for (const process of this.processes.values()) {
			if (!process.busy) {
				return process;
			}
		}
		return undefined;
	}

	/**
	 * Spawn a new child process and add it to the pool
	 */
	private spawnProcess(): PooledProcess {
		const id = randomUUID();
		const now = new Date();

		// Build execArgv with optional heap limit
		const execArgv = ['--enable-source-maps'];
		if (this.maxOldGenerationSizeMb) {
			execArgv.push(`--max-old-space-size=${this.maxOldGenerationSizeMb}`);
		}

		const child = fork(this.workerPath, [], { execArgv });

		const pooledProcess: PooledProcess = {
			child,
			id,
			busy: false,
			lastUsed: now,
			reuseCount: 0,
			spawnedAt: now,
		};

		this.processes.set(id, pooledProcess);

		// Handle process exit - remove from pool
		child.on('exit', (code, signal) => {
			console.log(`[ChildProcessPool] Process ${id} exited (code: ${code}, signal: ${signal})`);
			this.removeProcess(id);
		});

		// Handle process errors
		child.on('error', (error) => {
			console.error(`[ChildProcessPool] Process ${id} error:`, error);
			this.removeProcess(id, error);
		});

		return pooledProcess;
	}

	/**
	 * Clean up idle processes that haven't been used recently
	 */
	private cleanupIdleProcesses(): void {
		const now = Date.now();
		const processesToRemove: string[] = [];

		for (const [id, process] of this.processes.entries()) {
			// Don't kill busy processes
			if (process.busy) continue;

			const idleTime = now - process.lastUsed.getTime();
			if (idleTime > this.idleTimeout) {
				console.log(
					`[ChildProcessPool] Process ${id} idle for ${Math.round(idleTime / 1000)}s, removing`,
				);
				processesToRemove.push(id);
			}
		}

		for (const id of processesToRemove) {
			this.removeProcess(id);
		}
	}
}
