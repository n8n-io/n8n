import { TaskRunnersConfig } from '@n8n/config';
import * as a from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as process from 'node:process';
import { Service } from 'typedi';

import { OnShutdown } from '@/decorators/on-shutdown';
import { Logger } from '@/logging/logger.service';

import { TaskRunnerAuthService } from './auth/task-runner-auth.service';
import { forwardToLogger } from './forward-to-logger';
import { NodeProcessOomDetector } from './node-process-oom-detector';
import { RunnerLifecycleEvents } from './runner-lifecycle-events';
import { TypedEmitter } from '../typed-emitter';

type ChildProcess = ReturnType<typeof spawn>;

export type ExitReason = 'unknown' | 'oom';

export type TaskRunnerProcessEventMap = {
	exit: {
		reason: ExitReason;
	};
};

/**
 * Manages the JS task runner process as a child process
 */
@Service()
export class TaskRunnerProcess extends TypedEmitter<TaskRunnerProcessEventMap> {
	public get isRunning() {
		return this.process !== null;
	}

	/** The process ID of the task runner process */
	public get pid() {
		return this.process?.pid;
	}

	/** Promise that resolves when the process has exited */
	public get runPromise() {
		return this._runPromise;
	}

	private process: ChildProcess | null = null;

	private _runPromise: Promise<void> | null = null;

	private oomDetector: NodeProcessOomDetector | null = null;

	private isShuttingDown = false;

	private logger: Logger;

	private readonly passthroughEnvVars = [
		'PATH',
		'NODE_FUNCTION_ALLOW_BUILTIN',
		'NODE_FUNCTION_ALLOW_EXTERNAL',
		'N8N_SENTRY_DSN',
		// Metadata about the environment
		'N8N_VERSION',
		'ENVIRONMENT',
		'DEPLOYMENT_NAME',
	] as const;

	constructor(
		logger: Logger,
		private readonly runnerConfig: TaskRunnersConfig,
		private readonly authService: TaskRunnerAuthService,
		private readonly runnerLifecycleEvents: RunnerLifecycleEvents,
	) {
		super();

		a.ok(
			this.runnerConfig.mode !== 'external',
			'Task Runner Process cannot be used in external mode',
		);

		this.logger = logger.scoped('task-runner');

		this.runnerLifecycleEvents.on('runner:failed-heartbeat-check', () => {
			this.logger.warn('Task runner failed heartbeat check, restarting...');
			void this.forceRestart();
		});

		this.runnerLifecycleEvents.on('runner:timed-out-during-task', () => {
			this.logger.warn('Task runner timed out during task, restarting...');
			void this.forceRestart();
		});
	}

	async start() {
		a.ok(!this.process, 'Task Runner Process already running');

		const grantToken = await this.authService.createGrantToken();

		const n8nUri = `127.0.0.1:${this.runnerConfig.port}`;
		this.process = this.startNode(grantToken, n8nUri);

		forwardToLogger(this.logger, this.process, '[Task Runner]: ');

		this.monitorProcess(this.process);
	}

	startNode(grantToken: string, n8nUri: string) {
		const startScript = require.resolve('@n8n/task-runner/start');

		return spawn('node', [startScript], {
			env: this.getProcessEnvVars(grantToken, n8nUri),
		});
	}

	@OnShutdown()
	async stop() {
		if (!this.process) return;

		this.isShuttingDown = true;

		// TODO: Timeout & force kill
		this.killNode();
		await this._runPromise;

		this.isShuttingDown = false;
	}

	/** Force-restart a runner suspected of being unresponsive. */
	async forceRestart() {
		if (!this.process) return;

		this.process.kill('SIGKILL');

		await this._runPromise;
	}

	killNode() {
		if (!this.process) return;

		this.process.kill();
	}

	private monitorProcess(taskRunnerProcess: ChildProcess) {
		this._runPromise = new Promise((resolve) => {
			this.oomDetector = new NodeProcessOomDetector(taskRunnerProcess);

			taskRunnerProcess.on('exit', (code) => {
				this.onProcessExit(code, resolve);
			});
		});
	}

	private onProcessExit(_code: number | null, resolveFn: () => void) {
		this.process = null;
		this.emit('exit', { reason: this.oomDetector?.didProcessOom ? 'oom' : 'unknown' });
		resolveFn();

		if (!this.isShuttingDown) {
			setImmediate(async () => await this.start());
		}
	}

	private getProcessEnvVars(grantToken: string, n8nUri: string) {
		const envVars: Record<string, string> = {
			N8N_RUNNERS_GRANT_TOKEN: grantToken,
			N8N_RUNNERS_N8N_URI: n8nUri,
			N8N_RUNNERS_MAX_PAYLOAD: this.runnerConfig.maxPayload.toString(),
			N8N_RUNNERS_MAX_CONCURRENCY: this.runnerConfig.maxConcurrency.toString(),
			...this.getPassthroughEnvVars(),
		};

		if (this.runnerConfig.maxOldSpaceSize) {
			envVars.NODE_OPTIONS = `--max-old-space-size=${this.runnerConfig.maxOldSpaceSize}`;
		}

		return envVars;
	}

	private getPassthroughEnvVars() {
		return this.passthroughEnvVars.reduce<Record<string, string>>((env, key) => {
			if (process.env[key]) {
				env[key] = process.env[key];
			}

			return env;
		}, {});
	}
}
