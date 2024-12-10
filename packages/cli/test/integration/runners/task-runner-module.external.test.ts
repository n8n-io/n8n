import { TaskRunnersConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import Container from 'typedi';

import { MissingAuthTokenError } from '@/runners/errors/missing-auth-token.error';
import { TaskRunnerModule } from '@/runners/task-runner-module';

import { DefaultTaskRunnerDisconnectAnalyzer } from '../../../src/runners/default-task-runner-disconnect-analyzer';
import { TaskRunnerWsServer } from '../../../src/runners/runner-ws-server';

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

			const module = new TaskRunnerModule(mock(), runnerConfig);

			await expect(module.start()).rejects.toThrowError(MissingAuthTokenError);
		});

		it('should start the task runner', async () => {
			runnerConfig.enabled = true;

			// Act
			await module.start();
		});

		it('should use DefaultTaskRunnerDisconnectAnalyzer', () => {
			const wsServer = Container.get(TaskRunnerWsServer);

			expect(wsServer.getDisconnectAnalyzer()).toBeInstanceOf(DefaultTaskRunnerDisconnectAnalyzer);
		});
	});
});
