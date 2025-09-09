import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { exec, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { MissingRequirementsError } from './errors/missing-requirements.error';
import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';
import { ChildProcess, ExitReason, TaskRunnerProcessBase } from './task-runner-process-base';

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
		try {
			await asyncExec('python3 --version', { timeout: 5000 });
		} catch {
			throw new MissingRequirementsError('python');
		}

		const pythonDir = path.join(__dirname, '../../../@n8n/task-runner-python');
		const venvPath = path.join(pythonDir, '.venv/bin/python');

		if (!existsSync(venvPath)) throw new MissingRequirementsError('venv');

		return spawn(venvPath, ['-m', 'src.main'], {
			cwd: pythonDir,
			env: {
				N8N_RUNNERS_GRANT_TOKEN: grantToken,
				N8N_RUNNERS_TASK_BROKER_URI: taskBrokerUri,
			},
		});
	}

	setupProcessMonitoring(_process: ChildProcess) {
		// Not recommended for production, so not implemented.
	}

	analyzeExitReason(_code: number | null): { reason: ExitReason } {
		// Not recommended for production, so not implemented.
		return { reason: 'unknown' };
	}
}
