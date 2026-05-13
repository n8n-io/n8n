import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as process from 'node:process';

import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';
import { type ChildProcess, TaskRunnerProcessBase } from './task-runner-process-base';

/**
 * Manages the Harness Task Runner as a child process.
 * The harness runner executes external CLI tools (AI agents, coding assistants)
 * in isolated workspace directories.
 */
@Service()
export class HarnessTaskRunnerProcess extends TaskRunnerProcessBase {
	readonly name = 'runner:harness';

	readonly loggerScope = 'task-runner-harness' as const;

	constructor(
		readonly logger: Logger,
		readonly runnerConfig: TaskRunnersConfig,
		readonly authService: TaskBrokerAuthService,
		readonly runnerLifecycleEvents: TaskRunnerLifecycleEvents,
	) {
		super(logger, runnerConfig, authService, runnerLifecycleEvents);

		assert(this.isInternal, `${this.constructor.name} cannot be used in external mode`);
	}

	async startProcess(grantToken: string, taskBrokerUri: string): Promise<ChildProcess> {
		const startScript = require.resolve('@n8n/task-runner-harness/start');

		return spawn('node', [startScript], {
			env: this.getProcessEnvVars(grantToken, taskBrokerUri),
		});
	}

	private getProcessEnvVars(grantToken: string, taskBrokerUri: string) {
		const envVars: Record<string, string | undefined> = Object.assign(Object.create(null), {
			// System environment
			PATH: process.env.PATH,
			HOME: process.env.HOME ?? process.env.USERPROFILE,

			// Timezone
			GENERIC_TIMEZONE: process.env.GENERIC_TIMEZONE,

			// Runner broker connection
			N8N_RUNNERS_GRANT_TOKEN: grantToken,
			N8N_RUNNERS_TASK_BROKER_URI: taskBrokerUri,
			N8N_RUNNERS_MAX_PAYLOAD: this.runnerConfig.maxPayload.toString(),
			N8N_RUNNERS_HEARTBEAT_INTERVAL: this.runnerConfig.heartbeatInterval.toString(),

			// Harness-specific config
			N8N_RUNNERS_HARNESS_TIMEOUT: this.runnerConfig.harnessTimeout.toString(),
			N8N_RUNNERS_HARNESS_MAX_CONCURRENCY: this.runnerConfig.harnessMaxConcurrency.toString(),
			N8N_RUNNERS_HARNESS_MAX_OUTPUT_SIZE: this.runnerConfig.harnessMaxOutputSize.toString(),
		});

		return envVars;
	}
}
