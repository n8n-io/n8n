import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';

import { EventService } from '@/events/event.service';
import type { JsTaskRunnerProcess } from '@/task-runners/task-runner-process-js';
import type { PyTaskRunnerProcess } from '@/task-runners/task-runner-process-py';

import { MissingAuthTokenError } from './errors/missing-auth-token.error';
import type { TaskBrokerServer } from './task-broker/task-broker-server';
import type { LocalTaskRequester } from './task-managers/local-task-requester';

/**
 * Module responsible for starting the task broker that external task runners
 * (launched by a separate orchestrator) connect to.
 */
@Service()
export class TaskRunnerModule {
	private taskBrokerHttpServer: TaskBrokerServer | undefined;

	private taskRequester: LocalTaskRequester | undefined;

	private jsRunnerProcess: JsTaskRunnerProcess | undefined;

	private pyRunnerProcess: PyTaskRunnerProcess | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly runnerConfig: TaskRunnersConfig,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('task-runner');
	}

	async start() {
		const { authToken } = this.runnerConfig;

		if (!authToken) throw new MissingAuthTokenError();

		await this.loadTaskRequester();
		await this.loadTaskBroker();

		this.eventService.on('execution-cancelled', ({ executionId }) => {
			this.taskRequester?.cancelTasks(executionId);
		});
	}

	@OnShutdown()
	async stop() {
		// Stop the broker server first: its drain lets in-flight tasks finish, so the
		// runner processes are idle by the time they are stopped and exit within the
		// short grace before the SIGKILL escalation.
		if (this.taskBrokerHttpServer) {
			await this.taskBrokerHttpServer.stop();
			this.taskBrokerHttpServer = undefined;
		}

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

		await Promise.all([stopRunnerProcessTask, stopPythonRunnerProcessTask]);
	}

	private async loadTaskRequester() {
		const { TaskRequester } = await import('@/task-runners/task-managers/task-requester.js');
		const { LocalTaskRequester } = await import(
			'@/task-runners/task-managers/local-task-requester.js'
		);
		this.taskRequester = Container.get(LocalTaskRequester);
		Container.set(TaskRequester, this.taskRequester);
	}

	private async loadTaskBroker() {
		// These are imported dynamically because we need to set the task manager
		// instance before importing them
		const { TaskBrokerServer } = await import('@/task-runners/task-broker/task-broker-server.js');
		this.taskBrokerHttpServer = Container.get(TaskBrokerServer);

		await this.taskBrokerHttpServer.start();
	}
}
