import { Container } from '@n8n/di';

import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';
import { TaskBroker } from '@/task-runners/task-broker/task-broker.service';
import { TaskRunnerProcess } from '@/task-runners/task-runner-process';
import { TaskRunnerProcessRestartLoopDetector } from '@/task-runners/task-runner-process-restart-loop-detector';
import { retryUntil } from '@test-integration/retry-until';
import { setupBrokerTestServer } from '@test-integration/utils/task-broker-test-server';

describe('TaskRunnerProcess', () => {
	const { config, server: taskRunnerServer } = setupBrokerTestServer({
		mode: 'internal',
	});
	const runnerProcess = Container.get(TaskRunnerProcess);
	const taskBroker = Container.get(TaskBroker);
	const taskRunnerService = Container.get(TaskBrokerWsServer);

	beforeAll(async () => {
		await taskRunnerServer.start();
		// Set the port to the actually used port
		config.port = taskRunnerServer.port;
	});

	afterAll(async () => {
		await taskRunnerServer.stop();
	});

	afterEach(async () => {
		await runnerProcess.stop();
	});

	const getNumConnectedRunners = () => taskRunnerService.runnerConnections.size;
	const getNumRegisteredRunners = () => taskBroker.getKnownRunners().size;

	it('should start and connect the task runner', async () => {
		// Act
		await runnerProcess.start();

		// Assert
		expect(runnerProcess.isRunning).toBeTruthy();

		// Wait until the runner has connected
		await retryUntil(() => expect(getNumConnectedRunners()).toBe(1));
		expect(getNumRegisteredRunners()).toBe(1);
	});

	it('should stop an disconnect the task runner', async () => {
		// Arrange
		await runnerProcess.start();

		// Wait until the runner has connected
		await retryUntil(() => expect(getNumConnectedRunners()).toBe(1));
		expect(getNumRegisteredRunners()).toBe(1);

		// Act
		await runnerProcess.stop();

		// Assert
		// Wait until the runner has disconnected
		await retryUntil(() => expect(getNumConnectedRunners()).toBe(0));

		expect(runnerProcess.isRunning).toBeFalsy();
		expect(getNumRegisteredRunners()).toBe(0);
	});

	it('should restart the task runner if it exits', async () => {
		// Arrange
		await runnerProcess.start();

		// Wait until the runner has connected
		await retryUntil(() => expect(getNumConnectedRunners()).toBe(1));
		const processId = runnerProcess.pid;

		// Act
		// @ts-expect-error private property
		runnerProcess.process?.kill('SIGKILL');

		// Wait until the runner has exited
		await runnerProcess.runPromise;

		// Assert
		// Wait until the runner has connected again
		await retryUntil(() => expect(getNumConnectedRunners()).toBe(1));
		expect(getNumConnectedRunners()).toBe(1);
		expect(getNumRegisteredRunners()).toBe(1);
		expect(runnerProcess.pid).not.toBe(processId);
	});

	it('should work together with restart loop detector', async () => {
		// Arrange
		const restartLoopDetector = new TaskRunnerProcessRestartLoopDetector(runnerProcess);
		let restartLoopDetectedEventEmitted = false;
		restartLoopDetector.once('restart-loop-detected', () => {
			restartLoopDetectedEventEmitted = true;
		});

		// Act
		await runnerProcess.start();

		// Simulate a restart loop
		for (let i = 0; i < 5; i++) {
			await retryUntil(() => {
				expect(runnerProcess.pid).toBeDefined();
			});

			// @ts-expect-error private property
			runnerProcess.process?.kill();

			await new Promise((resolve) => {
				runnerProcess.once('exit', resolve);
			});
		}

		// Assert
		expect(restartLoopDetectedEventEmitted).toBe(true);
	});
});
