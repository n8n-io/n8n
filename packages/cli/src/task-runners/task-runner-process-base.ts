import { Logger } from '@n8n/backend-common';
import { LogScope, TaskRunnersConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

import { TypedEmitter } from '@/typed-emitter';

import { forwardToLogger } from './forward-to-logger';
import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';

export type ChildProcess = ReturnType<typeof spawn>;

export type ExitReason = 'unknown' | 'oom';

export type TaskRunnerProcessEventMap = {
	exit: {
		reason: ExitReason;
	};
};

@Service()
export abstract class TaskRunnerProcessBase extends TypedEmitter<TaskRunnerProcessEventMap> {
	protected readonly name: string;

	protected readonly loggerScope: LogScope;

	protected process: ChildProcess | null = null;

	protected _runPromise: Promise<void> | null = null;

	protected isShuttingDown = false;

	constructor(
		protected readonly logger: Logger,
		protected readonly runnerConfig: TaskRunnersConfig,
		protected readonly authService: TaskBrokerAuthService,
		protected readonly runnerLifecycleEvents: TaskRunnerLifecycleEvents,
	) {
		super();
		this.logger = logger.scoped(this.loggerScope);

		this.runnerLifecycleEvents.on('runner:failed-heartbeat-check', () => {
			this.logger.warn('Task runner failed heartbeat check, restarting...');
			void this.forceRestart();
		});

		this.runnerLifecycleEvents.on('runner:timed-out-during-task', () => {
			this.logger.warn('Task runner timed out during task, restarting...');
			void this.forceRestart();
		});
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

		const grantToken = await this.authService.createGrantToken();
		const taskBrokerUri = `http://127.0.0.1:${this.runnerConfig.port}`;

		this.process = await this.startProcess(grantToken, taskBrokerUri);
		forwardToLogger(this.logger, this.process, `[${this.name}] `);
		this.monitorProcess(this.process);
	}

	@OnShutdown()
	async stop() {
		if (!this.process) return;

		this.isShuttingDown = true;
		this.process.kill();
		await this._runPromise;
		this.isShuttingDown = false;
	}

	/** Force-restart a task runner process suspected of being unresponsive. */
	protected async forceRestart() {
		if (!this.process) return;

		this.process.kill('SIGKILL');
		await this._runPromise;
	}

	protected onProcessExit(code: number | null, resolveFn: () => void) {
		this.process = null;
		const exitReason = this.analyzeExitReason?.(code) ?? { reason: 'unknown' };
		this.emit('exit', exitReason);
		resolveFn();
		if (!this.isShuttingDown) {
			setImmediate(async () => await this.start());
		}
	}

	protected monitorProcess(taskRunnerProcess: ChildProcess) {
		this._runPromise = new Promise((resolve) => {
			this.setupProcessMonitoring?.(taskRunnerProcess);
			taskRunnerProcess.on('exit', (code) => {
				this.onProcessExit(code, resolve);
			});
		});
	}

	abstract startProcess(grantToken: string, taskBrokerUri: string): Promise<ChildProcess>;
	setupProcessMonitoring?(process: ChildProcess): void;
	analyzeExitReason?(code: number | null): { reason: ExitReason };
}
