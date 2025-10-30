import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { sleep } from 'n8n-workflow';
import * as a from 'node:assert/strict';

import { EventService } from '@/events/event.service';
import type { TaskRunnerRestartLoopError } from '@/task-runners/errors/task-runner-restart-loop-error';
import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';
import type { JsTaskRunnerProcess } from '@/task-runners/task-runner-process-js';
import type { PyTaskRunnerProcess } from '@/task-runners/task-runner-process-py';
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

	private jsRunnerProcess: JsTaskRunnerProcess | undefined;

	private pyRunnerProcess: PyTaskRunnerProcess | undefined;

	private jsRunnerProcessRestartLoopDetector: TaskRunnerProcessRestartLoopDetector | undefined;

	private pyRunnerProcessRestartLoopDetector: TaskRunnerProcessRestartLoopDetector | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly runnerConfig: TaskRunnersConfig,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('task-runner');
	}

	async start() {
		a.ok(this.runnerConfig.enabled, 'Task runner is disabled');

		const { mode, authToken } = this.runnerConfig;

		if (mode === 'external' && !authToken) throw new MissingAuthTokenError();

		await this.loadTaskRequester();
		await this.loadTaskBroker();

		this.eventService.on('execution-cancelled', ({ executionId }) => {
			this.taskRequester?.cancelTasks(executionId);
		});

		if (mode === 'internal') await this.startInternalTaskRunners();
	}

	@OnShutdown()
	async stop() {
		const stopRunnerProcessTask = (async () => {
			if (this.jsRunnerProcess) {
				await this.jsRunnerProcess.stop();
				this.jsRunnerProcess = undefined;
			}
		})();

		const stopPythonRunnerProcessTask = (async () => {
			if (this.pyRunnerProcess) {
				await this.pyRunnerProcess.stop();
				this.pyRunnerProcess = undefined;
			}
		})();

		const stopRunnerServerTask = (async () => {
			if (this.taskBrokerHttpServer) {
				await this.taskBrokerHttpServer.stop();
				this.taskBrokerHttpServer = undefined;
			}
		})();

		await Promise.all([stopRunnerProcessTask, stopPythonRunnerProcessTask, stopRunnerServerTask]);
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

	private async startInternalTaskRunners() {
		a.ok(this.taskBrokerWsServer, 'Task Runner WS Server not loaded');

		const { JsTaskRunnerProcess } = await import('@/task-runners/task-runner-process-js');
		this.jsRunnerProcess = Container.get(JsTaskRunnerProcess);
		this.jsRunnerProcessRestartLoopDetector = new TaskRunnerProcessRestartLoopDetector(
			this.jsRunnerProcess,
		);
		this.jsRunnerProcessRestartLoopDetector.on(
			'restart-loop-detected',
			this.onRunnerRestartLoopDetected,
		);

		await this.jsRunnerProcess.start();

		if (this.runnerConfig.isNativePythonRunnerEnabled) {
			const { PyTaskRunnerProcess } = await import('@/task-runners/task-runner-process-py');
			this.pyRunnerProcess = Container.get(PyTaskRunnerProcess);
			this.pyRunnerProcessRestartLoopDetector = new TaskRunnerProcessRestartLoopDetector(
				this.pyRunnerProcess,
			);
			this.pyRunnerProcessRestartLoopDetector.on(
				'restart-loop-detected',
				this.onRunnerRestartLoopDetected,
			);
			await this.pyRunnerProcess.start();
		}

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
