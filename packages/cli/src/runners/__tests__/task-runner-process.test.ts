import { TaskRunnersConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { ChildProcess, SpawnOptions } from 'node:child_process';

import { Logger } from '@/logging/logger.service';
import type { TaskRunnerAuthService } from '@/runners/auth/task-runner-auth.service';
import { TaskRunnerProcess } from '@/runners/task-runner-process';
import { mockInstance } from '@test/mocking';

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
	runnerConfig.disabled = false;
	runnerConfig.mode = 'internal_childprocess';
	const authService = mock<TaskRunnerAuthService>();
	let taskRunnerProcess = new TaskRunnerProcess(logger, runnerConfig, authService);

	afterEach(async () => {
		spawnMock.mockClear();
	});

	describe('constructor', () => {
		it('should throw if runner mode is external', () => {
			runnerConfig.mode = 'external';

			expect(() => new TaskRunnerProcess(logger, runnerConfig, authService)).toThrow();

			runnerConfig.mode = 'internal_childprocess';
		});
	});

	describe('start', () => {
		beforeEach(() => {
			taskRunnerProcess = new TaskRunnerProcess(logger, runnerConfig, authService);
		});

		test.each(['PATH', 'NODE_FUNCTION_ALLOW_BUILTIN', 'NODE_FUNCTION_ALLOW_EXTERNAL'])(
			'should propagate %s from env as is',
			async (envVar) => {
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
			},
		);

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
	});
});
