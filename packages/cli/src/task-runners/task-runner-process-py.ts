import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { exec, spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';
import { TaskRunnerProcessBase } from './task-runner-process-base';

const asyncExec = promisify(exec);

/**
 * Responsible for managing a Python task runner as a child process.
 * This is for internal mode, which is NOT recommended for production.
 */
@Service()
export class PyTaskRunnerProcess extends TaskRunnerProcessBase {
	protected readonly name = 'runner:py';

	protected readonly loggerScope = 'task-runner-py';

	constructor(
		readonly logger: Logger,
		readonly runnerConfig: TaskRunnersConfig,
		readonly authService: TaskBrokerAuthService,
		readonly runnerLifecycleEvents: TaskRunnerLifecycleEvents,
	) {
		super(logger, runnerConfig, authService, runnerLifecycleEvents);
	}

	async startProcess(grantToken: string, taskBrokerUri: string) {
		const pythonDir = path.join(__dirname, '../../../@n8n/task-runner-python');
		const venvPath = PyTaskRunnerProcess.getVenvPath();

		return spawn(venvPath, ['-m', 'src.main'], {
			cwd: pythonDir,
			env: {
				// system environment
				PATH: process.env.PATH,
				HOME: process.env.HOME,

				// runner
				N8N_RUNNERS_GRANT_TOKEN: grantToken,
				N8N_RUNNERS_TASK_BROKER_URI: taskBrokerUri,
				N8N_RUNNERS_MAX_PAYLOAD: this.runnerConfig.maxPayload.toString(),
				N8N_RUNNERS_MAX_CONCURRENCY: this.runnerConfig.maxConcurrency.toString(),
				N8N_RUNNERS_TASK_TIMEOUT: this.runnerConfig.taskTimeout.toString(),
				N8N_RUNNERS_HEARTBEAT_INTERVAL: this.runnerConfig.heartbeatInterval.toString(),
			},
		});
	}

	/**
	 * Check if Python requirements are met for internal mode.
	 * Returns the failure reason if requirements are missing, or `null` if all requirements are met.
	 */
	static async checkRequirements(): Promise<'python' | 'venv' | null> {
		try {
			await asyncExec('python3 --version', { timeout: 5000 });
		} catch {
			return 'python';
		}

		try {
			await access(PyTaskRunnerProcess.getVenvPath());
		} catch {
			return 'venv';
		}

		return null;
	}

	private static getVenvPath() {
		const pythonDir = path.join(__dirname, '../../../@n8n/task-runner-python');
		return path.join(pythonDir, '.venv/bin/python');
	}
}
