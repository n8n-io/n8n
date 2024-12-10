import { TaskRunnersConfig } from '@n8n/config';
import { ErrorReporterProxy, sleep } from 'n8n-workflow';
import * as a from 'node:assert/strict';
import Container, { Service } from 'typedi';

import { OnShutdown } from '@/decorators/on-shutdown';
import { Logger } from '@/logging/logger.service';
import type { TaskRunnerRestartLoopError } from '@/runners/errors/task-runner-restart-loop-error';
import type { TaskRunnerProcess } from '@/runners/task-runner-process';
import { TaskRunnerProcessRestartLoopDetector } from '@/runners/task-runner-process-restart-loop-detector';

import { MissingAuthTokenError } from './errors/missing-auth-token.error';
import { TaskRunnerWsServer } from './runner-ws-server';
import type { LocalTaskManager } from './task-managers/local-task-manager';
import type { TaskRunnerServer } from './task-runner-server';

/**
 * Module responsible for loading and starting task runner. Task runner can be
 * run either internally (=launched by n8n as a child process) or externally
 * (=launched by some other orchestrator)
 */
@Service()
export class TaskRunnerModule {
	private taskRunnerHttpServer: TaskRunnerServer | undefined;

	private taskRunnerWsServer: TaskRunnerWsServer | undefined;

	private taskManager: LocalTaskManager | undefined;

	private taskRunnerProcess: TaskRunnerProcess | undefined;

	private taskRunnerProcessRestartLoopDetector: TaskRunnerProcessRestartLoopDetector | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly runnerConfig: TaskRunnersConfig,
	) {
		this.logger = this.logger.scoped('task-runner');
	}

	async start() {
		a.ok(this.runnerConfig.enabled, 'Task runner is disabled');

		const { mode, authToken } = this.runnerConfig;

		if (mode === 'external' && !authToken) throw new MissingAuthTokenError();

		await this.loadTaskManager();
		await this.loadTaskRunnerServer();

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
			if (this.taskRunnerHttpServer) {
				await this.taskRunnerHttpServer.stop();
				this.taskRunnerHttpServer = undefined;
			}
		})();

		await Promise.all([stopRunnerProcessTask, stopRunnerServerTask]);
	}

	private async loadTaskManager() {
		const { TaskManager } = await import('@/runners/task-managers/task-manager');
		const { LocalTaskManager } = await import('@/runners/task-managers/local-task-manager');
		this.taskManager = Container.get(LocalTaskManager);
		Container.set(TaskManager, this.taskManager);
	}

	private async loadTaskRunnerServer() {
		// These are imported dynamically because we need to set the task manager
		// instance before importing them
		const { TaskRunnerServer } = await import('@/runners/task-runner-server');
		this.taskRunnerHttpServer = Container.get(TaskRunnerServer);
		this.taskRunnerWsServer = Container.get(TaskRunnerWsServer);

		await this.taskRunnerHttpServer.start();
	}

	private async startInternalTaskRunner() {
		a.ok(this.taskRunnerWsServer, 'Task Runner WS Server not loaded');

		const { TaskRunnerProcess } = await import('@/runners/task-runner-process');
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
			'@/runners/internal-task-runner-disconnect-analyzer'
		);
		this.taskRunnerWsServer.setDisconnectAnalyzer(
			Container.get(InternalTaskRunnerDisconnectAnalyzer),
		);
	}

	private onRunnerRestartLoopDetected = async (error: TaskRunnerRestartLoopError) => {
		this.logger.error(error.message);
		ErrorReporterProxy.error(error);

		// Allow some time for the error to be flushed
		await sleep(1000);
		process.exit(1);
	};
}
