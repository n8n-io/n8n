import { TaskRunnersConfig } from '@n8n/config';
import Container from 'typedi';

import { TaskRunnerService } from '@/runners/runner-ws-server';
import { TaskBroker } from '@/runners/task-broker.service';
import { TaskRunnerProcess } from '@/runners/task-runner-process';
import { TaskRunnerServer } from '@/runners/task-runner-server';
import { retryUntil } from '@test-integration/retry-until';

describe('TaskRunnerProcess', () => {
	const authToken = 'token';
	const runnerConfig = Container.get(TaskRunnersConfig);
	runnerConfig.disabled = false;
	runnerConfig.mode = 'internal_childprocess';
	runnerConfig.authToken = authToken;
	runnerConfig.port = 0; // Use any port
	const taskRunnerServer = Container.get(TaskRunnerServer);

	const runnerProcess = Container.get(TaskRunnerProcess);
	const taskBroker = Container.get(TaskBroker);
	const taskRunnerService = Container.get(TaskRunnerService);

	const startLauncherSpy = jest.spyOn(runnerProcess, 'startLauncher');
	const startNodeSpy = jest.spyOn(runnerProcess, 'startNode');
	const killLauncherSpy = jest.spyOn(runnerProcess, 'killLauncher');
	const killNodeSpy = jest.spyOn(runnerProcess, 'killNode');

	beforeAll(async () => {
		await taskRunnerServer.start();
		// Set the port to the actually used port
		runnerConfig.port = taskRunnerServer.port;
	});

	afterAll(async () => {
		await taskRunnerServer.stop();
	});

	afterEach(async () => {
		await runnerProcess.stop();

		startLauncherSpy.mockClear();
		startNodeSpy.mockClear();
		killLauncherSpy.mockClear();
		killNodeSpy.mockClear();
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

	it('should launch runner directly if not using a launcher', async () => {
		runnerConfig.mode = 'internal_childprocess';

		await runnerProcess.start();

		expect(startLauncherSpy).toBeCalledTimes(0);
		expect(startNodeSpy).toBeCalledTimes(1);
	});

	it('should use a launcher if configured', async () => {
		runnerConfig.mode = 'internal_launcher';
		runnerConfig.launcherPath = 'node';

		await runnerProcess.start();

		expect(startLauncherSpy).toBeCalledTimes(1);
		expect(startNodeSpy).toBeCalledTimes(0);
		runnerConfig.mode = 'internal_childprocess';
	});

	it('should kill the process directly if not using a launcher', async () => {
		runnerConfig.mode = 'internal_childprocess';

		await runnerProcess.start();
		await runnerProcess.stop();

		expect(killLauncherSpy).toBeCalledTimes(0);
		expect(killNodeSpy).toBeCalledTimes(1);
	});

	it('should kill the process using a launcher if configured', async () => {
		runnerConfig.mode = 'internal_launcher';
		runnerConfig.launcherPath = 'node';

		await runnerProcess.start();
		await runnerProcess.stop();

		expect(killLauncherSpy).toBeCalledTimes(1);
		expect(killNodeSpy).toBeCalledTimes(0);
		runnerConfig.mode = 'internal_childprocess';
	});
});
