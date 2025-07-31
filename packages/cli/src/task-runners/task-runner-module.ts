import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { sleep } from 'n8n-workflow';
import * as a from 'node:assert/strict';

import type { TaskRunnerRestartLoopError } from '@/task-runners/errors/task-runner-restart-loop-error';
import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';
import type { TaskRunnerProcess } from '@/task-runners/task-runner-process';
import { TaskRunnerProcessRestartLoopDetector } from '@/task-runners/task-runner-process-restart-loop-detector';

import { MissingAuthTokenError } from './errors/missing-auth-token.error';
import type { TaskBrokerServer } from './task-broker/task-broker-server';
import type { LocalTaskRequester } from './task-managers/local-task-requester';

/**
 * Module responsible for loading and starting task runner. Task runner can be
 * run either internally (=launched by n8n as a child process) or externally
 * (=launched by some other orchestrator)
 */
@Service()
export class TaskRunnerModule {
	private taskBrokerHttpServer: TaskBrokerServer | undefined;

	private taskBrokerWsServer: TaskBrokerWsServer | undefined;

	private taskRequester: LocalTaskRequester | undefined;

	private taskRunnerProcess: TaskRunnerProcess | undefined;

	private taskRunnerProcessRestartLoopDetector: TaskRunnerProcessRestartLoopDetector | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly runnerConfig: TaskRunnersConfig,
	) {
		this.logger = this.logger.scoped('task-runner');
	}

	async start() {
		a.ok(this.runnerConfig.enabled, 'Task runner is disabled');

		const { mode, authToken } = this.runnerConfig;

		if (mode === 'external' && !authToken) throw new MissingAuthTokenError();

		await this.loadTaskRequester();
		await this.loadTaskBroker();

		if (mode === 'internal') {
			await this.startInternalTaskRunner();
		}
	}

	@OnShutdown()
	async stop() {
		const stopRunnerProcessTask = (async () => {
			if (this.taskRunnerProcess) {
				await this.taskRunnerProcess.stop();
				this.taskRunnerProcess = undefined;
			}
		})();

		const stopRunnerServerTask = (async () => {
			if (this.taskBrokerHttpServer) {
				await this.taskBrokerHttpServer.stop();
				this.taskBrokerHttpServer = undefined;
			}
		})();

		await Promise.all([stopRunnerProcessTask, stopRunnerServerTask]);
	}

	private async loadTaskRequester() {
		const { TaskRequester } = await import('@/task-runners/task-managers/task-requester');
		const { LocalTaskRequester } = await import(
			'@/task-runners/task-managers/local-task-requester'
		);
		this.taskRequester = Container.get(LocalTaskRequester);
		Container.set(TaskRequester, this.taskRequester);
	}

	private async loadTaskBroker() {
		// These are imported dynamically because we need to set the task manager
		// instance before importing them
		const { TaskBrokerServer } = await import('@/task-runners/task-broker/task-broker-server');
		this.taskBrokerHttpServer = Container.get(TaskBrokerServer);
		this.taskBrokerWsServer = Container.get(TaskBrokerWsServer);

		await this.taskBrokerHttpServer.start();
	}

	private async startInternalTaskRunner() {
		a.ok(this.taskBrokerWsServer, 'Task Runner WS Server not loaded');

		const { TaskRunnerProcess } = await import('@/task-runners/task-runner-process');
		this.taskRunnerProcess = Container.get(TaskRunnerProcess);
		this.taskRunnerProcessRestartLoopDetector = new TaskRunnerProcessRestartLoopDetector(
			this.taskRunnerProcess,
		);
		this.taskRunnerProcessRestartLoopDetector.on(
			'restart-loop-detected',
			this.onRunnerRestartLoopDetected,
		);

		await this.taskRunnerProcess.start();

		const { InternalTaskRunnerDisconnectAnalyzer } = await import(
			'@/task-runners/internal-task-runner-disconnect-analyzer'
		);
		this.taskBrokerWsServer.setDisconnectAnalyzer(
			Container.get(InternalTaskRunnerDisconnectAnalyzer),
		);
	}

	private onRunnerRestartLoopDetected = async (error: TaskRunnerRestartLoopError) => {
		this.logger.error(error.message);
		this.errorReporter.error(error);

		// Allow some time for the error to be flushed
		await sleep(1000);
		process.exit(1);
	};
}
