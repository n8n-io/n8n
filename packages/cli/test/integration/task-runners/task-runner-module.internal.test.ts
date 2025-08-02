import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { InternalTaskRunnerDisconnectAnalyzer } from '@/task-runners/internal-task-runner-disconnect-analyzer';
import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';

describe('TaskRunnerModule in internal mode', () => {
	const runnerConfig = Container.get(TaskRunnersConfig);
	runnerConfig.port = 0; // Random port
	runnerConfig.mode = 'internal';
	runnerConfig.enabled = true;
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

		it('should start the task runner', async () => {
			runnerConfig.enabled = true;

			// Act
			await module.start();
		});

		it('should use InternalTaskRunnerDisconnectAnalyzer', () => {
			const wsServer = Container.get(TaskBrokerWsServer);

			expect(wsServer.getDisconnectAnalyzer()).toBeInstanceOf(InternalTaskRunnerDisconnectAnalyzer);
		});
	});
});
