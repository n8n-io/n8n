'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const default_task_runner_disconnect_analyzer_1 = require('@/task-runners/default-task-runner-disconnect-analyzer');
const missing_auth_token_error_1 = require('@/task-runners/errors/missing-auth-token.error');
const task_broker_ws_server_1 = require('@/task-runners/task-broker/task-broker-ws-server');
const task_runner_module_1 = require('@/task-runners/task-runner-module');
describe('TaskRunnerModule in external mode', () => {
	const runnerConfig = di_1.Container.get(config_1.TaskRunnersConfig);
	runnerConfig.mode = 'external';
	runnerConfig.port = 0;
	runnerConfig.authToken = 'test';
	const module = di_1.Container.get(task_runner_module_1.TaskRunnerModule);
	afterEach(async () => {
		await module.stop();
	});
	describe('start', () => {
		it('should throw if the task runner is disabled', async () => {
			runnerConfig.enabled = false;
			await expect(module.start()).rejects.toThrow('Task runner is disabled');
		});
		it('should throw if auth token is missing', async () => {
			const runnerConfig = new config_1.TaskRunnersConfig();
			runnerConfig.mode = 'external';
			runnerConfig.enabled = true;
			runnerConfig.authToken = '';
			const module = new task_runner_module_1.TaskRunnerModule(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				runnerConfig,
			);
			await expect(module.start()).rejects.toThrowError(
				missing_auth_token_error_1.MissingAuthTokenError,
			);
		});
		it('should start the task runner', async () => {
			runnerConfig.enabled = true;
			await module.start();
		});
		it('should use DefaultTaskRunnerDisconnectAnalyzer', () => {
			const wsServer = di_1.Container.get(task_broker_ws_server_1.TaskBrokerWsServer);
			expect(wsServer.getDisconnectAnalyzer()).toBeInstanceOf(
				default_task_runner_disconnect_analyzer_1.DefaultTaskRunnerDisconnectAnalyzer,
			);
		});
	});
});
//# sourceMappingURL=task-runner-module.external.test.js.map
