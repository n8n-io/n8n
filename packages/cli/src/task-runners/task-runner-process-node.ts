import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as process from 'node:process';

import { NodeProcessOomDetector } from './node-process-oom-detector';
import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';
import { type ChildProcess, type ExitReason, TaskRunnerProcessBase } from './task-runner-process-base';

/**
 * Responsible for managing the Node task runner as a child process.
 * This runner executes any n8n node type in a sandboxed environment.
 *
 * Unlike the JS runner which executes Code node scripts, this runner
 * executes actual node implementations with bundled source code sent
 * over the wire.
 */
@Service()
export class NodeTaskRunnerProcess extends TaskRunnerProcessBase {
	readonly name = 'runner:node';

	readonly loggerScope = 'task-runner-node';

	private oomDetector: NodeProcessOomDetector | null = null;

	constructor(
		readonly logger: Logger,
		readonly runnerConfig: TaskRunnersConfig,
		readonly authService: TaskBrokerAuthService,
		readonly runnerLifecycleEvents: TaskRunnerLifecycleEvents,
	) {
		super(logger, runnerConfig, authService, runnerLifecycleEvents);

		assert(this.isInternal, `${this.constructor.name} cannot be used in external mode`);

		this.logger.debug('NodeTaskRunnerProcess initialized');
	}

	async startProcess(grantToken: string, taskBrokerUri: string): Promise<ChildProcess> {
		const startScript = require.resolve('@n8n/task-runner/start-node-runner');
		const flags = ['--disallow-code-generation-from-strings', '--disable-proto=delete'];

		this.logger.debug('Starting node task runner process', {
			startScript,
			flags,
			taskBrokerUri,
		});

		const childProcess = spawn('node', [...flags, startScript], {
			env: this.getProcessEnvVars(grantToken, taskBrokerUri),
		});

		this.logger.debug('Node task runner process spawned', { pid: childProcess.pid });

		return childProcess;
	}

	setupProcessMonitoring(childProcess: ChildProcess) {
		this.logger.debug('Setting up process monitoring for node runner', { pid: childProcess.pid });
		this.oomDetector = new NodeProcessOomDetector(childProcess);
	}

	analyzeExitReason(): { reason: ExitReason } {
		const reason = this.oomDetector?.didProcessOom ? 'oom' : 'unknown';
		this.logger.debug('Analyzing node runner exit reason', { reason });
		return { reason };
	}

	private getProcessEnvVars(grantToken: string, taskBrokerUri: string) {
		const envVars: Record<string, string | undefined> = {
			// system environment
			PATH: process.env.PATH,
			HOME: process.env.HOME,
			NODE_PATH: process.env.NODE_PATH,

			// n8n
			GENERIC_TIMEZONE: process.env.GENERIC_TIMEZONE,

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
		};

		if (this.runnerConfig.maxOldSpaceSize) {
			envVars.NODE_OPTIONS = `--max-old-space-size=${this.runnerConfig.maxOldSpaceSize}`;
		}

		return envVars;
	}
}
