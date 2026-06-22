import { Container } from '@n8n/di';

import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';
import { TaskBroker } from '@/task-runners/task-broker/task-broker.service';
import { JsTaskRunnerProcess } from '@/task-runners/task-runner-process-js';
import { retryUntil } from '@test-integration/retry-until';
import { setupBrokerTestServer } from '@test-integration/utils/task-broker-test-server';

describe('TaskRunnerProcess', () => {
	// Restarting the runner spawns a fresh `node` child process and waits for the
	// full WebSocket handshake. Under CI load this can take longer than the default
	// per-test timeout, so give this spawn-heavy suite extra headroom.
	jest.setTimeout(30_000);

	// Every `start()` spawns a `node` child process and waits for the WebSocket
	// handshake to complete. Under CI load that can comfortably exceed the default
	// 5s `retryUntil` window, so allow a longer window for all connect waits.
	const CONNECT_TIMEOUT_MS = 15_000;

	const { config, server: taskRunnerServer } = setupBrokerTestServer({
		mode: 'internal',
	});
	const runnerProcess = Container.get(JsTaskRunnerProcess);
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
		await retryUntil(() => expect(getNumConnectedRunners()).toBe(1), {
			timeoutMs: CONNECT_TIMEOUT_MS,
		});
		expect(getNumRegisteredRunners()).toBe(1);
	});

	it('should stop an disconnect the task runner', async () => {
		// Arrange
		await runnerProcess.start();

		// Wait until the runner has connected
		await retryUntil(() => expect(getNumConnectedRunners()).toBe(1), {
			timeoutMs: CONNECT_TIMEOUT_MS,
		});
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
		await retryUntil(() => expect(getNumConnectedRunners()).toBe(1), {
			timeoutMs: CONNECT_TIMEOUT_MS,
		});
		const processId = runnerProcess.pid;

		// Act
		// @ts-expect-error private property
		runnerProcess.process?.kill('SIGKILL');

		// Wait until the runner has exited
		await runnerProcess.runPromise;

		// Assert
		// Wait until the runner has connected again. Restarting spawns a fresh
		// child process and re-runs the WebSocket handshake, which is slower and
		// more load-sensitive than the initial connect, so allow a longer window.
		await retryUntil(() => expect(getNumConnectedRunners()).toBe(1), {
			timeoutMs: CONNECT_TIMEOUT_MS,
		});
		expect(getNumConnectedRunners()).toBe(1);
		expect(getNumRegisteredRunners()).toBe(1);
		expect(runnerProcess.pid).not.toBe(processId);
	});
});
