import { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { ChildProcess, SpawnOptions } from 'node:child_process';

import { mockInstance } from '../../../test/shared/mocking';
import type { TaskRunnerAuthService } from '../auth/task-runner-auth.service';
import { TaskRunnerProcess } from '../task-runner-process';

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
	const globalConfig = mockInstance(GlobalConfig);
	const authService = mock<TaskRunnerAuthService>();
	const taskRunnerProcess = new TaskRunnerProcess(globalConfig, authService);

	afterEach(async () => {
		spawnMock.mockClear();
	});

	describe('start', () => {
		it('should propagate NODE_FUNCTION_ALLOW_BUILTIN and NODE_FUNCTION_ALLOW_EXTERNAL from env', async () => {
			jest.spyOn(authService, 'createGrantToken').mockResolvedValue('grantToken');
			process.env.NODE_FUNCTION_ALLOW_BUILTIN = '*';
			process.env.NODE_FUNCTION_ALLOW_EXTERNAL = '*';

			await taskRunnerProcess.start();

			// @ts-expect-error The type is not correct
			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(options.env).toEqual(
				expect.objectContaining({
					NODE_FUNCTION_ALLOW_BUILTIN: '*',
					NODE_FUNCTION_ALLOW_EXTERNAL: '*',
				}),
			);
		});
	});
});
