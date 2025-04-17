import { TaskRunnersConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import { Logger } from 'n8n-core';
import type { ChildProcess, SpawnOptions } from 'node:child_process';

import type { TaskBrokerAuthService } from '@/task-runners/task-broker/auth/task-broker-auth.service';
import { TaskRunnerProcess } from '@/task-runners/task-runner-process';
import { mockInstance } from '@test/mocking';

import type { TaskRunnerLifecycleEvents } from '../task-runner-lifecycle-events';

const spawnMock = jest.fn(() =>
	mock<ChildProcess>({
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
	const logger = mockInstance(Logger);
	const runnerConfig = mockInstance(TaskRunnersConfig);
	runnerConfig.enabled = true;
	runnerConfig.mode = 'internal';
	const authService = mock<TaskBrokerAuthService>();
	let taskRunnerProcess = new TaskRunnerProcess(logger, runnerConfig, authService, mock());

	afterEach(async () => {
		spawnMock.mockClear();
	});

	describe('constructor', () => {
		it('should throw if runner mode is external', () => {
			runnerConfig.mode = 'external';

			expect(() => new TaskRunnerProcess(logger, runnerConfig, authService, mock())).toThrow();

			runnerConfig.mode = 'internal';
		});

		it('should register listener for `runner:failed-heartbeat-check` event', () => {
			const runnerLifecycleEvents = mock<TaskRunnerLifecycleEvents>();
			new TaskRunnerProcess(logger, runnerConfig, authService, runnerLifecycleEvents);

			expect(runnerLifecycleEvents.on).toHaveBeenCalledWith(
				'runner:failed-heartbeat-check',
				expect.any(Function),
			);
		});

		it('should register listener for `runner:timed-out-during-task` event', () => {
			const runnerLifecycleEvents = mock<TaskRunnerLifecycleEvents>();
			new TaskRunnerProcess(logger, runnerConfig, authService, runnerLifecycleEvents);

			expect(runnerLifecycleEvents.on).toHaveBeenCalledWith(
				'runner:timed-out-during-task',
				expect.any(Function),
			);
		});
	});

	describe('start', () => {
		beforeEach(() => {
			taskRunnerProcess = new TaskRunnerProcess(logger, runnerConfig, authService, mock());
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
			'N8N_RUNNERS_ALLOW_PROTOTYPE_MUTATION',
		])('should propagate %s from env as is', async (envVar) => {
			jest.spyOn(authService, 'createGrantToken').mockResolvedValue('grantToken');
			process.env[envVar] = 'custom value';

			await taskRunnerProcess.start();

			// @ts-expect-error The type is not correct
			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
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

			// @ts-expect-error The type is not correct
			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
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

			// @ts-expect-error The type is not correct
			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(options.env).not.toHaveProperty('NODE_OPTIONS');
		});

		it('should use --disallow-code-generation-from-strings and --disable-proto=delete flags', async () => {
			jest.spyOn(authService, 'createGrantToken').mockResolvedValue('grantToken');

			await taskRunnerProcess.start();

			expect(spawnMock.mock.calls[0].at(1)).toEqual([
				'--disallow-code-generation-from-strings',
				'--disable-proto=delete',
				expect.stringContaining('/packages/@n8n/task-runner/dist/start.js'),
			]);
		});
	});
});
