'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const internal_task_runner_disconnect_analyzer_1 = require('@/task-runners/internal-task-runner-disconnect-analyzer');
const task_broker_ws_server_1 = require('@/task-runners/task-broker/task-broker-ws-server');
const task_runner_module_1 = require('@/task-runners/task-runner-module');
describe('TaskRunnerModule in internal mode', () => {
	const runnerConfig = di_1.Container.get(config_1.TaskRunnersConfig);
	runnerConfig.port = 0;
	runnerConfig.mode = 'internal';
	runnerConfig.enabled = true;
	const module = di_1.Container.get(task_runner_module_1.TaskRunnerModule);
	afterEach(async () => {
		await module.stop();
	});
	describe('start', () => {
		it('should throw if the task runner is disabled', async () => {
			runnerConfig.enabled = false;
			await expect(module.start()).rejects.toThrow('Task runner is disabled');
		});
		it('should start the task runner', async () => {
			runnerConfig.enabled = true;
			await module.start();
		});
		it('should use InternalTaskRunnerDisconnectAnalyzer', () => {
			const wsServer = di_1.Container.get(task_broker_ws_server_1.TaskBrokerWsServer);
			expect(wsServer.getDisconnectAnalyzer()).toBeInstanceOf(
				internal_task_runner_disconnect_analyzer_1.InternalTaskRunnerDisconnectAnalyzer,
			);
		});
	});
});
//# sourceMappingURL=task-runner-module.internal.test.js.map
