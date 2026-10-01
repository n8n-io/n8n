import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { InternalTaskRunnerDisconnectAnalyzer } from '@/task-runners/internal-task-runner-disconnect-analyzer';
import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';
import { PyTaskRunnerProcess } from '@/task-runners/task-runner-process-py';

// Direct method replacement (not vi.spyOn) because the root vi config
// enables `restoreMocks: true` which restores spies between tests, but
// `module.start()` calls `checkRequirements` and we need the stub to remain
// active throughout the file.
const originalCheckRequirements = PyTaskRunnerProcess.checkRequirements;
beforeAll(() => {
	PyTaskRunnerProcess.checkRequirements = async () => 'python';
});
afterAll(() => {
	PyTaskRunnerProcess.checkRequirements = originalCheckRequirements;
});

describe('TaskRunnerModule in internal mode', () => {
	const runnerConfig = Container.get(TaskRunnersConfig);
	runnerConfig.port = 0; // Random port
	runnerConfig.mode = 'internal';
	const module = Container.get(TaskRunnerModule);

	afterEach(async () => {
		await module.stop();
	});

	describe('start', () => {
		it('should start the task runner', async () => {
			// Act
			await module.start();
		});

		it('should use InternalTaskRunnerDisconnectAnalyzer', () => {
			const wsServer = Container.get(TaskBrokerWsServer);

			expect(wsServer.getDisconnectAnalyzer()).toBeInstanceOf(InternalTaskRunnerDisconnectAnalyzer);
		});
	});
});
