import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { TaskRunnersConfig } from '@n8n/config';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { mock } from 'vitest-mock-extended';

import type { TaskBrokerAuthService } from '@/task-runners/task-broker/auth/task-broker-auth.service';
import { JsTaskRunnerProcess } from '@/task-runners/task-runner-process-js';

import type { TaskRunnerLifecycleEvents } from '../task-runner-lifecycle-events';

// Source imports `spawn` from `node:child_process` as an ESM binding, so mutating
// `require('child_process').spawn` does not intercept it — mock the module instead.
const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock('node:child_process', async () => ({
	...(await vi.importActual<typeof import('node:child_process')>('node:child_process')),
	spawn: spawnMock,
}));

describe('TaskRunnerProcess', () => {
	beforeEach(() => {
		// restoreMocks resets the implementation before each test.
		spawnMock.mockReturnValue(
			mock<ChildProcess>({
				stdout: { pipe: vi.fn() },
				stderr: { pipe: vi.fn() },
			}),
		);
	});

	const logger = mockInstance(Logger);
	const runnerConfig = mockInstance(TaskRunnersConfig);
	runnerConfig.mode = 'internal';
	runnerConfig.insecureMode = false;
	const authService = mock<TaskBrokerAuthService>();
	let taskRunnerProcess = new JsTaskRunnerProcess(logger, runnerConfig, authService, mock());

	afterEach(async () => {
		spawnMock.mockClear();
	});

	describe('constructor', () => {
		it('should throw if runner mode is external', () => {
			runnerConfig.mode = 'external';

			expect(() => new JsTaskRunnerProcess(logger, runnerConfig, authService, mock())).toThrow();

			runnerConfig.mode = 'internal';
		});

		it('should register listener for `runner:failed-heartbeat-check` event', () => {
			const runnerLifecycleEvents = mock<TaskRunnerLifecycleEvents>();
			new JsTaskRunnerProcess(logger, runnerConfig, authService, runnerLifecycleEvents);

			expect(runnerLifecycleEvents.on).toHaveBeenCalledWith(
				'runner:failed-heartbeat-check',
				expect.any(Function),
			);
		});

		it('should register listener for `runner:timed-out-during-task` event', () => {
			const runnerLifecycleEvents = mock<TaskRunnerLifecycleEvents>();
			new JsTaskRunnerProcess(logger, runnerConfig, authService, runnerLifecycleEvents);

			expect(runnerLifecycleEvents.on).toHaveBeenCalledWith(
				'runner:timed-out-during-task',
				expect.any(Function),
			);
		});
	});

	describe('start', () => {
		beforeEach(() => {
			taskRunnerProcess = new JsTaskRunnerProcess(logger, runnerConfig, authService, mock());
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
			authService.createGrantToken.mockResolvedValue('grantToken');
			process.env[envVar] = 'custom value';

			await taskRunnerProcess.start();

			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(options.env).toEqual(
				expect.objectContaining({
					[envVar]: 'custom value',
				}),
			);
		});

		it('should pass NODE_OPTIONS env if maxOldSpaceSize is configured', async () => {
			authService.createGrantToken.mockResolvedValue('grantToken');
			runnerConfig.maxOldSpaceSize = '1024';

			await taskRunnerProcess.start();

			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(options.env).toEqual(
				expect.objectContaining({
					NODE_OPTIONS: '--max-old-space-size=1024',
				}),
			);
		});

		it('should not pass NODE_OPTIONS env if maxOldSpaceSize is not configured', async () => {
			authService.createGrantToken.mockResolvedValue('grantToken');
			runnerConfig.maxOldSpaceSize = '';

			await taskRunnerProcess.start();

			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(options.env).not.toHaveProperty('NODE_OPTIONS');
		});

		it('should build env with a null prototype', async () => {
			authService.createGrantToken.mockResolvedValue('grantToken');

			await taskRunnerProcess.start();

			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(Object.getPrototypeOf(options.env)).toBeNull();
		});

		it('should not inherit env keys from Object.prototype', async () => {
			authService.createGrantToken.mockResolvedValue('grantToken');
			runnerConfig.maxOldSpaceSize = '';
			const proto = Object.prototype as Record<string, unknown>;
			proto.NODE_OPTIONS = '--inherited-value';

			try {
				await taskRunnerProcess.start();

				const options = spawnMock.mock.calls[0][2] as SpawnOptions;
				expect(options.env?.NODE_OPTIONS).toBeUndefined();
			} finally {
				delete proto.NODE_OPTIONS;
			}
		});

		it('should pass N8N_RUNNERS_TASK_TIMEOUT if set', async () => {
			authService.createGrantToken.mockResolvedValue('grantToken');
			runnerConfig.taskTimeout = 123;

			await taskRunnerProcess.start();

			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(options.env).toEqual(
				expect.objectContaining({
					N8N_RUNNERS_TASK_TIMEOUT: '123',
				}),
			);
		});

		it('should pass N8N_RUNNERS_HEARTBEAT_INTERVAL if set', async () => {
			authService.createGrantToken.mockResolvedValue('grantToken');
			runnerConfig.heartbeatInterval = 456;

			await taskRunnerProcess.start();

			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(options.env).toEqual(
				expect.objectContaining({
					N8N_RUNNERS_HEARTBEAT_INTERVAL: '456',
				}),
			);
		});

		it('on secure mode, should use --disallow-code-generation-from-strings and --disable-proto=delete flags', async () => {
			authService.createGrantToken.mockResolvedValue('grantToken');

			await taskRunnerProcess.start();

			expect(spawnMock.mock.calls[0].at(1)).toEqual([
				'--disallow-code-generation-from-strings',
				'--disable-proto=delete',
				expect.stringContaining('/packages/@n8n/task-runner/dist/start.js'),
			]);
		});

		it('on insecure mode, should not use --disallow-code-generation-from-strings and --disable-proto=delete flags', async () => {
			authService.createGrantToken.mockResolvedValue('grantToken');
			runnerConfig.insecureMode = true;
			const insecureTaskRunnerProcess = new JsTaskRunnerProcess(
				logger,
				runnerConfig,
				authService,
				mock(),
			);

			await insecureTaskRunnerProcess.start();

			expect(spawnMock.mock.calls[0].at(1)).toEqual([
				expect.stringContaining('/packages/@n8n/task-runner/dist/start.js'),
			]);
		});
	});
});
