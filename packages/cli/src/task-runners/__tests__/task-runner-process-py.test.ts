import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { TaskRunnersConfig } from '@n8n/config';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { mock } from 'vitest-mock-extended';

import type { TaskBrokerAuthService } from '@/task-runners/task-broker/auth/task-broker-auth.service';
import { PyTaskRunnerProcess } from '@/task-runners/task-runner-process-py';

// Source imports `spawn` from `node:child_process` as an ESM binding, so mutating
// `require('child_process').spawn` does not intercept it — mock the module instead.
const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock('node:child_process', async () => ({
	...(await vi.importActual<typeof import('node:child_process')>('node:child_process')),
	spawn: spawnMock,
}));

describe('PyTaskRunnerProcess', () => {
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
	const authService = mock<TaskBrokerAuthService>();
	let taskRunnerProcess = new PyTaskRunnerProcess(logger, runnerConfig, authService, mock());

	afterEach(() => {
		spawnMock.mockClear();
	});

	describe('start', () => {
		beforeEach(() => {
			taskRunnerProcess = new PyTaskRunnerProcess(logger, runnerConfig, authService, mock());
			authService.createGrantToken.mockResolvedValue('grantToken');
		});

		test.each([
			'PATH',
			'N8N_RUNNERS_STDLIB_ALLOW',
			'N8N_RUNNERS_EXTERNAL_ALLOW',
			'N8N_RUNNERS_BUILTINS_DENY',
			'N8N_BLOCK_RUNNER_ENV_ACCESS',
		])('should propagate %s from env as is', async (envVar) => {
			process.env[envVar] = 'custom value';

			await taskRunnerProcess.start();

			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(options.env).toEqual(
				expect.objectContaining({
					[envVar]: 'custom value',
				}),
			);
		});

		it('should build env with a null prototype', async () => {
			await taskRunnerProcess.start();

			const options = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(Object.getPrototypeOf(options.env)).toBeNull();
		});

		it('should not inherit env keys from Object.prototype', async () => {
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
	});
});
