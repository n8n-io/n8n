import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { DefaultTaskRunnerDisconnectAnalyzer } from '@/task-runners/default-task-runner-disconnect-analyzer';
import { MissingAuthTokenError } from '@/task-runners/errors/missing-auth-token.error';
import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';

describe('TaskRunnerModule in external mode', () => {
	const runnerConfig = Container.get(TaskRunnersConfig);
	runnerConfig.mode = 'external';
	runnerConfig.port = 0;
	runnerConfig.authToken = 'test';
	const module = Container.get(TaskRunnerModule);

	afterEach(async () => {
		await module.stop();
	});

	describe('start', () => {
		it('should throw if the task runner is disabled', async () => {
			runnerConfig.enabled = false;

			// Act
			await expect(module.start()).rejects.toThrow('Task runner is disabled');
		});

		it('should throw if auth token is missing', async () => {
			const runnerConfig = new TaskRunnersConfig();
			runnerConfig.mode = 'external';
			runnerConfig.enabled = true;
			runnerConfig.authToken = '';

			const module = new TaskRunnerModule(mock(), mock(), runnerConfig);

			await expect(module.start()).rejects.toThrowError(MissingAuthTokenError);
		});

		it('should start the task runner', async () => {
			runnerConfig.enabled = true;

			// Act
			await module.start();
		});

		it('should use DefaultTaskRunnerDisconnectAnalyzer', () => {
			const wsServer = Container.get(TaskBrokerWsServer);

			expect(wsServer.getDisconnectAnalyzer()).toBeInstanceOf(DefaultTaskRunnerDisconnectAnalyzer);
		});
	});
});
