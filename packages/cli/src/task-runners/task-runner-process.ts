import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import * as a from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as process from 'node:process';

import { forwardToLogger } from './forward-to-logger';
import { NodeProcessOomDetector } from './node-process-oom-detector';
import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';
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
	get isRunning() {
		return this.process !== null;
	}

	/** The process ID of the task runner process */
	get pid() {
		return this.process?.pid;
	}

	/** Promise that resolves when the process has exited */
	get runPromise() {
		return this._runPromise;
	}

	private process: ChildProcess | null = null;

	private _runPromise: Promise<void> | null = null;

	private oomDetector: NodeProcessOomDetector | null = null;

	private isShuttingDown = false;

	private logger: Logger;

	/** Environment variables inherited by the child process from the current environment. */
	private readonly passthroughEnvVars = [
		'PATH',
		'HOME', // So home directory can be resolved correctly
		'GENERIC_TIMEZONE',
		'NODE_FUNCTION_ALLOW_BUILTIN',
		'NODE_FUNCTION_ALLOW_EXTERNAL',
		'N8N_SENTRY_DSN',
		'N8N_RUNNERS_INSECURE_MODE',
		// Metadata about the environment
		'N8N_VERSION',
		'ENVIRONMENT',
		'DEPLOYMENT_NAME',
		'NODE_PATH',
	] as const;

	private readonly mode: 'insecure' | 'secure' = 'secure';

	constructor(
		logger: Logger,
		private readonly runnerConfig: TaskRunnersConfig,
		private readonly authService: TaskBrokerAuthService,
		private readonly runnerLifecycleEvents: TaskRunnerLifecycleEvents,
	) {
		super();

		a.ok(
			this.runnerConfig.mode !== 'external',
			'Task Runner Process cannot be used in external mode',
		);

		this.mode = this.runnerConfig.insecureMode ? 'insecure' : 'secure';

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

		const taskBrokerUri = `http://127.0.0.1:${this.runnerConfig.port}`;
		this.process = this.startNode(grantToken, taskBrokerUri);

		forwardToLogger(this.logger, this.process, '[Task Runner]: ');

		this.monitorProcess(this.process);
	}

	startNode(grantToken: string, taskBrokerUri: string) {
		const startScript = require.resolve('@n8n/task-runner/start');

		const flags =
			this.mode === 'secure'
				? ['--disallow-code-generation-from-strings', '--disable-proto=delete']
				: [];

		return spawn('node', [...flags, startScript], {
			env: this.getProcessEnvVars(grantToken, taskBrokerUri),
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

	private getProcessEnvVars(grantToken: string, taskBrokerUri: string) {
		const envVars: Record<string, string> = {
			N8N_RUNNERS_GRANT_TOKEN: grantToken,
			N8N_RUNNERS_TASK_BROKER_URI: taskBrokerUri,
			N8N_RUNNERS_MAX_PAYLOAD: this.runnerConfig.maxPayload.toString(),
			N8N_RUNNERS_MAX_CONCURRENCY: this.runnerConfig.maxConcurrency.toString(),
			N8N_RUNNERS_TASK_TIMEOUT: this.runnerConfig.taskTimeout.toString(),
			N8N_RUNNERS_HEARTBEAT_INTERVAL: this.runnerConfig.heartbeatInterval.toString(),
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
