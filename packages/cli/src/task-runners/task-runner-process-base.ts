import { Logger, TypedEmitter } from '@n8n/backend-common';
import { LogScope, TaskRunnersConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { nanoid } from 'nanoid';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

import { forwardToLogger } from './forward-to-logger';
import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';

export type ChildProcess = ReturnType<typeof spawn>;

const RESTART_RETRY_BASE_DELAY_MS = 5_000;
const RESTART_RETRY_MAX_DELAY_MS = 30_000;

/** How long a stopping runner gets to exit gracefully before it is force-killed. */
const RUNNER_EXIT_GRACE_MS = 2_000;

export function restartRetryDelay(attempt: number): number {
	return Math.min(RESTART_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RESTART_RETRY_MAX_DELAY_MS);
}

export type ExitReason = 'unknown' | 'oom';

export type TaskRunnerProcessEventMap = {
	exit: {
		reason: ExitReason;
	};
};

@Service()
export abstract class TaskRunnerProcessBase extends TypedEmitter<TaskRunnerProcessEventMap> {
	protected readonly name: string;

	/** ID assigned to the runner in the current process, for it to identify as to the broker. */
	private runnerId: string | null = null;

	protected process: ChildProcess | null = null;

	protected _runPromise: Promise<void> | null = null;

	private startPromise: Promise<void> | null = null;

	protected isShuttingDown = false;

	constructor(
		loggerScope: LogScope,
		protected readonly logger: Logger,
		protected readonly runnerConfig: TaskRunnersConfig,
		protected readonly authService: TaskBrokerAuthService,
		protected readonly runnerLifecycleEvents: TaskRunnerLifecycleEvents,
	) {
		super();
		this.logger = logger.scoped(loggerScope);

		this.runnerLifecycleEvents.on('runner:failed-heartbeat-check', ({ runnerId }) => {
			this.restartIfOwnRunner(runnerId, 'failed heartbeat check');
		});

		this.runnerLifecycleEvents.on('runner:timed-out-during-task', ({ runnerId }) => {
			this.restartIfOwnRunner(runnerId, 'timed out during task');
		});

		this.runnerLifecycleEvents.on('runner:unresponsive', ({ runnerId }) => {
			this.restartIfOwnRunner(runnerId, 'was reported unresponsive');
		});
	}

	/** Force-restarts this process if the reported runner is the one currently running in it. */
	private restartIfOwnRunner(runnerId: string, cause: string) {
		if (runnerId === this.runnerId) {
			this.logger.warn(`Task runner ${cause}, restarting...`);
			void this.forceRestart();
		}
	}

	get isRunning() {
		return this.process !== null;
	}

	get pid() {
		return this.process?.pid;
	}

	get runPromise() {
		return this._runPromise;
	}

	get isInternal() {
		return this.runnerConfig.mode === 'internal';
	}

	async start() {
		assert(!this.process, `${this.name} already running`);
		this.isShuttingDown = false;

		this.startPromise = this.spawnAndMonitor();
		try {
			await this.startPromise;
		} finally {
			this.startPromise = null;
		}
	}

	private async spawnAndMonitor() {
		// A relaunched runner is a new runner, so it gets a new ID.
		this.runnerId = nanoid();

		const grantToken = await this.authService.createGrantToken(this.runnerId);
		const taskBrokerUri = `http://127.0.0.1:${this.runnerConfig.port}`;

		const runnerProcess = this.startProcess(grantToken, taskBrokerUri, this.runnerId);

		try {
			forwardToLogger(this.logger, runnerProcess, `[${this.name}] `);
			this.monitorProcess(runnerProcess);
		} catch (error) {
			runnerProcess.kill();
			throw error;
		}

		this.process = runnerProcess;
	}

	/** Stops the runner and prevents any further relaunch. */
	@OnShutdown()
	async stop() {
		this.isShuttingDown = true;

		await this.startPromise?.catch(() => {});

		if (this.process) {
			this.process.kill();
			// A runner wedged on an in-flight task never exits gracefully and would
			// hold shutdown until the force-kill timer. Escalate after a short grace.
			await Promise.race([this._runPromise, sleep(RUNNER_EXIT_GRACE_MS)]);
			if (this.process) {
				this.process.kill('SIGKILL');
				await this._runPromise;
			}
		}
	}

	/**
	 * Force-restart a task runner process suspected of being unresponsive.
	 * A no-op once shutdown has begun, so a late report cannot revive the runner.
	 */
	protected async forceRestart() {
		if (!this.isShuttingDown && this.process) {
			this.process.kill('SIGKILL');
			await this._runPromise;
		}
	}

	protected onProcessExit(code: number | null, resolveFn: () => void) {
		this.process = null;
		this.runnerId = null;
		const exitReason = this.analyzeExitReason?.(code) ?? { reason: 'unknown' };
		this.emit('exit', exitReason);
		resolveFn();
		if (!this.isShuttingDown) {
			setImmediate(async () => await this.startWithRetries());
		}
	}

	private async startWithRetries() {
		let started = false;
		let failedAttempts = 0;

		while (!this.isShuttingDown && !started) {
			try {
				await this.start();
				started = true;
			} catch (error) {
				failedAttempts++;
				const delayMs = restartRetryDelay(failedAttempts);
				this.logger.error(`Failed to start ${this.name}, retrying in ${delayMs}ms`, { error });
				await sleep(delayMs);
			}
		}
	}

	protected monitorProcess(taskRunnerProcess: ChildProcess) {
		this.setupProcessMonitoring?.(taskRunnerProcess);

		this._runPromise = new Promise((resolve) => {
			let exited = false;
			const onExit = (code: number | null) => {
				if (!exited) {
					exited = true;
					this.onProcessExit(code, resolve);
				}
			};

			taskRunnerProcess.on('exit', onExit);

			// A process that failed to spawn (no pid) emits `error` and may never emit `exit`.
			taskRunnerProcess.on('error', (error) => {
				this.logger.error(`${this.name} process errored`, { error });
				if (taskRunnerProcess.pid === undefined) {
					onExit(null);
				}
			});
		});
	}

	/**
	 * Spawns the runner process and returns it.
	 *
	 * Synchronous by contract: monitoring is attached to the returned process, and
	 * an `exit` emitted before that attachment is lost, leaving the runner dead
	 * with no relaunch. Any async preparation belongs before the spawn.
	 */
	abstract startProcess(grantToken: string, taskBrokerUri: string, runnerId: string): ChildProcess;
	setupProcessMonitoring?(process: ChildProcess): void;
	analyzeExitReason?(code: number | null): { reason: ExitReason };
}
