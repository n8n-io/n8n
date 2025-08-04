'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const di_1 = require('@n8n/di');
const task_broker_ws_server_1 = require('@/task-runners/task-broker/task-broker-ws-server');
const task_broker_service_1 = require('@/task-runners/task-broker/task-broker.service');
const task_runner_process_1 = require('@/task-runners/task-runner-process');
const task_runner_process_restart_loop_detector_1 = require('@/task-runners/task-runner-process-restart-loop-detector');
const retry_until_1 = require('@test-integration/retry-until');
const task_broker_test_server_1 = require('@test-integration/utils/task-broker-test-server');
describe('TaskRunnerProcess', () => {
	const { config, server: taskRunnerServer } = (0, task_broker_test_server_1.setupBrokerTestServer)(
		{
			mode: 'internal',
		},
	);
	const runnerProcess = di_1.Container.get(task_runner_process_1.TaskRunnerProcess);
	const taskBroker = di_1.Container.get(task_broker_service_1.TaskBroker);
	const taskRunnerService = di_1.Container.get(task_broker_ws_server_1.TaskBrokerWsServer);
	beforeAll(async () => {
		await taskRunnerServer.start();
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
		await runnerProcess.start();
		expect(runnerProcess.isRunning).toBeTruthy();
		await (0, retry_until_1.retryUntil)(() => expect(getNumConnectedRunners()).toBe(1));
		expect(getNumRegisteredRunners()).toBe(1);
	});
	it('should stop an disconnect the task runner', async () => {
		await runnerProcess.start();
		await (0, retry_until_1.retryUntil)(() => expect(getNumConnectedRunners()).toBe(1));
		expect(getNumRegisteredRunners()).toBe(1);
		await runnerProcess.stop();
		await (0, retry_until_1.retryUntil)(() => expect(getNumConnectedRunners()).toBe(0));
		expect(runnerProcess.isRunning).toBeFalsy();
		expect(getNumRegisteredRunners()).toBe(0);
	});
	it('should restart the task runner if it exits', async () => {
		await runnerProcess.start();
		await (0, retry_until_1.retryUntil)(() => expect(getNumConnectedRunners()).toBe(1));
		const processId = runnerProcess.pid;
		runnerProcess.process?.kill('SIGKILL');
		await runnerProcess.runPromise;
		await (0, retry_until_1.retryUntil)(() => expect(getNumConnectedRunners()).toBe(1));
		expect(getNumConnectedRunners()).toBe(1);
		expect(getNumRegisteredRunners()).toBe(1);
		expect(runnerProcess.pid).not.toBe(processId);
	});
	it('should work together with restart loop detector', async () => {
		const restartLoopDetector =
			new task_runner_process_restart_loop_detector_1.TaskRunnerProcessRestartLoopDetector(
				runnerProcess,
			);
		let restartLoopDetectedEventEmitted = false;
		restartLoopDetector.once('restart-loop-detected', () => {
			restartLoopDetectedEventEmitted = true;
		});
		await runnerProcess.start();
		for (let i = 0; i < 5; i++) {
			await (0, retry_until_1.retryUntil)(() => {
				expect(runnerProcess.pid).toBeDefined();
			});
			runnerProcess.process?.kill();
			await new Promise((resolve) => {
				runnerProcess.once('exit', resolve);
			});
		}
		expect(restartLoopDetectedEventEmitted).toBe(true);
	});
});
//# sourceMappingURL=task-runner-process.test.js.map
