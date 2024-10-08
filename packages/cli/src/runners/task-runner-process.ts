import { GlobalConfig } from '@n8n/config';
import * as a from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { Service } from 'typedi';

import { TaskRunnerAuthService } from './auth/task-runner-auth.service';
import { OnShutdown } from '../decorators/on-shutdown';

type ChildProcess = ReturnType<typeof spawn>;

/**
 * Manages the JS task runner process as a child process
 */
@Service()
export class TaskRunnerProcess {
	public get isRunning() {
		return this.process !== null;
	}

	/** The process ID of the task runner process */
	public get pid() {
		return this.process?.pid;
	}

	private process: ChildProcess | null = null;

	/** Promise that resolves after the process has exited */
	private runPromise: Promise<void> | null = null;

	private isShuttingDown = false;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly authService: TaskRunnerAuthService,
	) {}

	async start() {
		a.ok(!this.process, 'Task Runner Process already running');

		const grantToken = await this.authService.createGrantToken();
		const startScript = require.resolve('@n8n/task-runner');

		this.process = spawn('node', [startScript], {
			env: {
				PATH: process.env.PATH,
				N8N_RUNNERS_GRANT_TOKEN: grantToken,
				N8N_RUNNERS_N8N_URI: `127.0.0.1:${this.globalConfig.taskRunners.port}`,
			},
		});

		this.process.stdout?.pipe(process.stdout);
		this.process.stderr?.pipe(process.stderr);

		this.monitorProcess(this.process);
	}

	@OnShutdown()
	async stop() {
		if (!this.process) {
			return;
		}

		this.isShuttingDown = true;

		// TODO: Timeout & force kill
		this.process.kill();
		await this.runPromise;

		this.isShuttingDown = false;
	}

	private monitorProcess(process: ChildProcess) {
		this.runPromise = new Promise((resolve) => {
			process.on('exit', (code) => {
				this.onProcessExit(code, resolve);
			});
		});
	}

	private onProcessExit(_code: number | null, resolveFn: () => void) {
		this.process = null;
		resolveFn();

		// If we are not shutting down, restart the process
		if (!this.isShuttingDown) {
			setImmediate(async () => await this.start());
		}
	}
}
