import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as process from 'node:process';

import { NodeProcessOomDetector } from './node-process-oom-detector';
import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';
import { ChildProcess, ExitReason, TaskRunnerProcessBase } from './task-runner-process-base';

/**
 * Responsible for managing a JavaScript task runner as a child process.
 * This is for internal mode, which is NOT recommended for production.
 */
@Service()
export class JsTaskRunnerProcess extends TaskRunnerProcessBase {
	readonly name = 'runnner:js';

	readonly loggerScope = 'task-runner-js';

	private oomDetector: NodeProcessOomDetector | null = null;

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
		const startScript = require.resolve('@n8n/task-runner/start');
		const flags = this.runnerConfig.insecureMode
			? []
			: ['--disallow-code-generation-from-strings', '--disable-proto=delete'];

		return spawn('node', [...flags, startScript], {
			env: this.getProcessEnvVars(grantToken, taskBrokerUri),
		});
	}

	setupProcessMonitoring(process: ChildProcess) {
		this.oomDetector = new NodeProcessOomDetector(process);
	}

	analyzeExitReason(): { reason: ExitReason } {
		return { reason: this.oomDetector?.didProcessOom ? 'oom' : 'unknown' };
	}

	private getProcessEnvVars(grantToken: string, taskBrokerUri: string) {
		const envVars: Record<string, string | undefined> = {
			// system environment
			PATH: process.env.PATH,
			HOME: process.env.HOME,
			NODE_PATH: process.env.NODE_PATH,

			// n8n
			GENERIC_TIMEZONE: process.env.GENERIC_TIMEZONE,
			NODE_FUNCTION_ALLOW_BUILTIN: process.env.NODE_FUNCTION_ALLOW_BUILTIN,
			NODE_FUNCTION_ALLOW_EXTERNAL: process.env.NODE_FUNCTION_ALLOW_EXTERNAL,

			// sentry
			N8N_SENTRY_DSN: process.env.N8N_SENTRY_DSN,
			N8N_VERSION: process.env.N8N_VERSION,
			ENVIRONMENT: process.env.ENVIRONMENT,
			DEPLOYMENT_NAME: process.env.DEPLOYMENT_NAME,

			// runner
			N8N_RUNNERS_GRANT_TOKEN: grantToken,
			N8N_RUNNERS_TASK_BROKER_URI: taskBrokerUri,
			N8N_RUNNERS_MAX_PAYLOAD: this.runnerConfig.maxPayload.toString(),
			N8N_RUNNERS_MAX_CONCURRENCY: this.runnerConfig.maxConcurrency.toString(),
			N8N_RUNNERS_TASK_TIMEOUT: this.runnerConfig.taskTimeout.toString(),
			N8N_RUNNERS_HEARTBEAT_INTERVAL: this.runnerConfig.heartbeatInterval.toString(),
			N8N_RUNNERS_INSECURE_MODE: process.env.N8N_RUNNERS_INSECURE_MODE,
		};

		if (this.runnerConfig.maxOldSpaceSize) {
			envVars.NODE_OPTIONS = `--max-old-space-size=${this.runnerConfig.maxOldSpaceSize}`;
		}

		return envVars;
	}
}
