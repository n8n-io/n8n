'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const jest_mock_extended_1 = require('jest-mock-extended');
const task_runner_process_1 = require('@/task-runners/task-runner-process');
const spawnMock = jest.fn(() =>
	(0, jest_mock_extended_1.mock)({
		stdout: {
			pipe: jest.fn(),
		},
		stderr: {
			pipe: jest.fn(),
		},
	}),
);
require('child_process').spawn = spawnMock;
describe('TaskRunnerProcess', () => {
	const logger = (0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const runnerConfig = (0, backend_test_utils_1.mockInstance)(config_1.TaskRunnersConfig);
	runnerConfig.enabled = true;
	runnerConfig.mode = 'internal';
	runnerConfig.insecureMode = false;
	const authService = (0, jest_mock_extended_1.mock)();
	let taskRunnerProcess = new task_runner_process_1.TaskRunnerProcess(
		logger,
		runnerConfig,
		authService,
		(0, jest_mock_extended_1.mock)(),
	);
	afterEach(async () => {
		spawnMock.mockClear();
	});
	describe('constructor', () => {
		it('should throw if runner mode is external', () => {
			runnerConfig.mode = 'external';
			expect(
				() =>
					new task_runner_process_1.TaskRunnerProcess(
						logger,
						runnerConfig,
						authService,
						(0, jest_mock_extended_1.mock)(),
					),
			).toThrow();
			runnerConfig.mode = 'internal';
		});
		it('should register listener for `runner:failed-heartbeat-check` event', () => {
			const runnerLifecycleEvents = (0, jest_mock_extended_1.mock)();
			new task_runner_process_1.TaskRunnerProcess(
				logger,
				runnerConfig,
				authService,
				runnerLifecycleEvents,
			);
			expect(runnerLifecycleEvents.on).toHaveBeenCalledWith(
				'runner:failed-heartbeat-check',
				expect.any(Function),
			);
		});
		it('should register listener for `runner:timed-out-during-task` event', () => {
			const runnerLifecycleEvents = (0, jest_mock_extended_1.mock)();
			new task_runner_process_1.TaskRunnerProcess(
				logger,
				runnerConfig,
				authService,
				runnerLifecycleEvents,
			);
			expect(runnerLifecycleEvents.on).toHaveBeenCalledWith(
				'runner:timed-out-during-task',
				expect.any(Function),
			);
		});
	});
	describe('start', () => {
		beforeEach(() => {
			taskRunnerProcess = new task_runner_process_1.TaskRunnerProcess(
				logger,
				runnerConfig,
				authService,
				(0, jest_mock_extended_1.mock)(),
			);
		});
		test.each([
			'PATH',
			'NODE_FUNCTION_ALLOW_BUILTIN',
			'NODE_FUNCTION_ALLOW_EXTERNAL',
			'N8N_SENTRY_DSN',
			'N8N_VERSION',
			'ENVIRONMENT',
			'DEPLOYMENT_NAME',
			'NODE_PATH',
			'GENERIC_TIMEZONE',
			'N8N_RUNNERS_INSECURE_MODE',
		])('should propagate %s from env as is', async (envVar) => {
			jest.spyOn(authService, 'createGrantToken').mockResolvedValue('grantToken');
			process.env[envVar] = 'custom value';
			await taskRunnerProcess.start();
			const options = spawnMock.mock.calls[0][2];
			expect(options.env).toEqual(
				expect.objectContaining({
					[envVar]: 'custom value',
				}),
			);
		});
		it('should pass NODE_OPTIONS env if maxOldSpaceSize is configured', async () => {
			jest.spyOn(authService, 'createGrantToken').mockResolvedValue('grantToken');
			runnerConfig.maxOldSpaceSize = '1024';
			await taskRunnerProcess.start();
			const options = spawnMock.mock.calls[0][2];
			expect(options.env).toEqual(
				expect.objectContaining({
					NODE_OPTIONS: '--max-old-space-size=1024',
				}),
			);
		});
		it('should not pass NODE_OPTIONS env if maxOldSpaceSize is not configured', async () => {
			jest.spyOn(authService, 'createGrantToken').mockResolvedValue('grantToken');
			runnerConfig.maxOldSpaceSize = '';
			await taskRunnerProcess.start();
			const options = spawnMock.mock.calls[0][2];
			expect(options.env).not.toHaveProperty('NODE_OPTIONS');
		});
		it('should pass N8N_RUNNERS_TASK_TIMEOUT if set', async () => {
			jest.spyOn(authService, 'createGrantToken').mockResolvedValue('grantToken');
			runnerConfig.taskTimeout = 123;
			await taskRunnerProcess.start();
			const options = spawnMock.mock.calls[0][2];
			expect(options.env).toEqual(
				expect.objectContaining({
					N8N_RUNNERS_TASK_TIMEOUT: '123',
				}),
			);
		});
		it('should pass N8N_RUNNERS_HEARTBEAT_INTERVAL if set', async () => {
			jest.spyOn(authService, 'createGrantToken').mockResolvedValue('grantToken');
			runnerConfig.heartbeatInterval = 456;
			await taskRunnerProcess.start();
			const options = spawnMock.mock.calls[0][2];
			expect(options.env).toEqual(
				expect.objectContaining({
					N8N_RUNNERS_HEARTBEAT_INTERVAL: '456',
				}),
			);
		});
		it('on secure mode, should use --disallow-code-generation-from-strings and --disable-proto=delete flags', async () => {
			jest.spyOn(authService, 'createGrantToken').mockResolvedValue('grantToken');
			await taskRunnerProcess.start();
			expect(spawnMock.mock.calls[0].at(1)).toEqual([
				'--disallow-code-generation-from-strings',
				'--disable-proto=delete',
				expect.stringContaining('/packages/@n8n/task-runner/dist/start.js'),
			]);
		});
		it('on insecure mode, should not use --disallow-code-generation-from-strings and --disable-proto=delete flags', async () => {
			jest.spyOn(authService, 'createGrantToken').mockResolvedValue('grantToken');
			runnerConfig.insecureMode = true;
			const insecureTaskRunnerProcess = new task_runner_process_1.TaskRunnerProcess(
				logger,
				runnerConfig,
				authService,
				(0, jest_mock_extended_1.mock)(),
			);
			await insecureTaskRunnerProcess.start();
			expect(spawnMock.mock.calls[0].at(1)).toEqual([
				expect.stringContaining('/packages/@n8n/task-runner/dist/start.js'),
			]);
		});
	});
});
//# sourceMappingURL=task-runner-process.test.js.map
