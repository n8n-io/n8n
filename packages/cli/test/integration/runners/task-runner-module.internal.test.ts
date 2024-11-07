import { TaskRunnersConfig } from '@n8n/config';
import Container from 'typedi';

import { TaskRunnerModule } from '@/runners/task-runner-module';

describe('TaskRunnerModule in internal_childprocess mode', () => {
	const runnerConfig = Container.get(TaskRunnersConfig);
	runnerConfig.port = 0; // Random port
	runnerConfig.mode = 'internal_childprocess';
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
	});
});
