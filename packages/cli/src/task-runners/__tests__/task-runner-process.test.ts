import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { TaskRunnersConfig } from '@n8n/config';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { TaskBrokerAuthService } from '@/task-runners/task-broker/auth/task-broker-auth.service';
import { JsTaskRunnerProcess } from '@/task-runners/task-runner-process-js';

import { TaskRunnerLifecycleEvents } from '../task-runner-lifecycle-events';
import { restartRetryDelay } from '../task-runner-process-base';

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
		logger.scoped.mockReturnValue(logger);
	});

	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);
	const runnerConfig = mockInstance(TaskRunnersConfig);
	runnerConfig.mode = 'internal';
	runnerConfig.insecureMode = false;
	const authService = mock<TaskBrokerAuthService>();
	let taskRunnerProcess = new JsTaskRunnerProcess(logger, runnerConfig, authService, mock());

	const createChildProcess = (pid?: number) =>
		Object.assign(new EventEmitter(), {
			pid,
			stdout: new EventEmitter(),
			stderr: new EventEmitter(),
			kill: vi.fn(),
		}) as unknown as ChildProcess;

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

		it('should scope the logger to the runner', () => {
			new JsTaskRunnerProcess(logger, runnerConfig, authService, mock());

			expect(logger.scoped).toHaveBeenCalledWith('task-runner-js');
		});

		it('should register listener for `runner:unresponsive` event', () => {
			const runnerLifecycleEvents = mock<TaskRunnerLifecycleEvents>();
			new JsTaskRunnerProcess(logger, runnerConfig, authService, runnerLifecycleEvents);

			expect(runnerLifecycleEvents.on).toHaveBeenCalledWith(
				'runner:unresponsive',
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

		it('should bind the assigned runner ID to the grant token', async () => {
			authService.createGrantToken.mockResolvedValue('grantToken');

			await taskRunnerProcess.start();

			const { env } = spawnMock.mock.calls[0][2] as SpawnOptions;
			expect(authService.createGrantToken).toHaveBeenCalledWith(env!.N8N_RUNNERS_ID);
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

	describe('relaunch on unexpected exit', () => {
		let auth: MockProxy<TaskBrokerAuthService>;

		beforeEach(() => {
			vi.useFakeTimers();
			auth = mock<TaskBrokerAuthService>();
			auth.createGrantToken.mockResolvedValue('grantToken');
			taskRunnerProcess = new JsTaskRunnerProcess(logger, runnerConfig, auth, mock());
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should relaunch the runner after it exits', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();

			child.emit('exit', 1);
			await vi.advanceTimersByTimeAsync(0);

			expect(spawnMock).toHaveBeenCalledTimes(2);
		});

		it('should keep retrying when a relaunch attempt fails', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();
			auth.createGrantToken.mockRejectedValueOnce(new Error('grant token unavailable'));

			child.emit('exit', 1);
			await vi.advanceTimersByTimeAsync(0);
			expect(spawnMock).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(5_000);
			expect(spawnMock).toHaveBeenCalledTimes(2);
		});

		it('should back off between failed relaunch attempts', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();
			auth.createGrantToken
				.mockRejectedValueOnce(new Error('grant token unavailable'))
				.mockRejectedValueOnce(new Error('grant token unavailable'));

			child.emit('exit', 1);
			await vi.advanceTimersByTimeAsync(5_000);
			expect(spawnMock).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(5_000);
			expect(spawnMock).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(5_000);
			expect(spawnMock).toHaveBeenCalledTimes(2);
		});

		it('should keep retrying when a relaunch fails after the spawn', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();

			const unwirableChild = Object.assign(new EventEmitter(), {
				pid: 43,
				stdout: {
					on: () => {
						throw new Error('stream closed');
					},
				},
				stderr: new EventEmitter(),
				kill: vi.fn(),
			}) as unknown as ChildProcess;
			spawnMock.mockReturnValueOnce(unwirableChild);

			child.emit('exit', 1);
			await vi.advanceTimersByTimeAsync(0);
			expect(unwirableChild.kill).toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(5_000);

			expect(spawnMock).toHaveBeenCalledTimes(3);
			expect(taskRunnerProcess.isRunning).toBe(true);
		});

		it('should keep retrying when setting up process monitoring fails', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();

			const unmonitorableChild = createChildProcess(43);
			spawnMock.mockReturnValueOnce(unmonitorableChild);
			vi.spyOn(taskRunnerProcess, 'setupProcessMonitoring').mockImplementationOnce(() => {
				throw new Error('failed to attach monitoring');
			});

			child.emit('exit', 1);
			await vi.advanceTimersByTimeAsync(0);
			expect(unmonitorableChild.kill).toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(5_000);

			expect(spawnMock).toHaveBeenCalledTimes(3);
			expect(taskRunnerProcess.isRunning).toBe(true);
		});

		it('should relaunch the runner when it errors without exiting', async () => {
			const failedSpawn = createChildProcess(undefined);
			const child = createChildProcess(42);
			spawnMock.mockReturnValueOnce(failedSpawn).mockReturnValue(child);
			await taskRunnerProcess.start();

			failedSpawn.emit('error', new Error('spawn EAGAIN'));
			await vi.advanceTimersByTimeAsync(0);

			expect(spawnMock).toHaveBeenCalledTimes(2);
		});

		it('should relaunch only once when a failed spawn emits both error and exit', async () => {
			const failedSpawn = createChildProcess(undefined);
			const child = createChildProcess(42);
			spawnMock.mockReturnValueOnce(failedSpawn).mockReturnValue(child);
			await taskRunnerProcess.start();

			failedSpawn.emit('error', new Error('spawn EAGAIN'));
			failedSpawn.emit('exit', 1);
			await vi.advanceTimersByTimeAsync(5_000);

			expect(spawnMock).toHaveBeenCalledTimes(2);
		});

		it('should not treat an error from a spawned process as an exit', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();

			child.emit('error', new Error('kill EPERM'));
			await vi.advanceTimersByTimeAsync(5_000);

			expect(spawnMock).toHaveBeenCalledTimes(1);
		});

		it('should not relaunch after stop', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();

			const stopPromise = taskRunnerProcess.stop();
			child.emit('exit', 0);
			await stopPromise;
			await vi.advanceTimersByTimeAsync(5_000);

			expect(spawnMock).toHaveBeenCalledTimes(1);
		});

		it('should relaunch on exit again after a stop and an explicit restart', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();

			const stopPromise = taskRunnerProcess.stop();
			child.emit('exit', 0);
			await stopPromise;

			await taskRunnerProcess.start();
			child.emit('exit', 1);
			await vi.advanceTimersByTimeAsync(0);

			expect(spawnMock).toHaveBeenCalledTimes(3);
			// the exit during the stop must not have left a retry loop behind
			expect(vi.getTimerCount()).toBe(0);
		});

		it('should kill a runner spawned by a relaunch that was in flight when stop began', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();

			let releaseGrantToken!: (token: string) => void;
			auth.createGrantToken.mockImplementationOnce(
				async () =>
					await new Promise<string>((resolve) => {
						releaseGrantToken = resolve;
					}),
			);
			child.emit('exit', 1);
			await vi.advanceTimersByTimeAsync(0);

			const relaunchedChild = createChildProcess(43);
			spawnMock.mockReturnValue(relaunchedChild);
			const stopPromise = taskRunnerProcess.stop();
			releaseGrantToken('grantToken');
			await vi.advanceTimersByTimeAsync(0);

			expect(relaunchedChild.kill).toHaveBeenCalled();
			relaunchedChild.emit('exit', 0);
			await stopPromise;

			expect(taskRunnerProcess.isRunning).toBe(false);
			await vi.advanceTimersByTimeAsync(10_000);
			expect(spawnMock).toHaveBeenCalledTimes(2);
		});

		it('should stop retrying once shutdown begins', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();
			auth.createGrantToken.mockRejectedValueOnce(new Error('grant token unavailable'));

			child.emit('exit', 1);
			await vi.advanceTimersByTimeAsync(0);
			await taskRunnerProcess.stop();
			await vi.advanceTimersByTimeAsync(10_000);

			expect(spawnMock).toHaveBeenCalledTimes(1);
		});
	});

	describe('restart on runner report', () => {
		let runnerLifecycleEvents: TaskRunnerLifecycleEvents;

		beforeEach(() => {
			vi.useFakeTimers();
			const auth = mock<TaskBrokerAuthService>();
			auth.createGrantToken.mockResolvedValue('grantToken');
			runnerLifecycleEvents = new TaskRunnerLifecycleEvents();
			taskRunnerProcess = new JsTaskRunnerProcess(
				logger,
				runnerConfig,
				auth,
				runnerLifecycleEvents,
			);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const RESTART_EVENTS = [
			'runner:failed-heartbeat-check',
			'runner:timed-out-during-task',
			'runner:unresponsive',
		] as const;

		/** ID the runner in the nth spawned process was told to identify as. */
		const assignedRunnerId = (spawnIndex: number) => {
			const { env } = spawnMock.mock.calls[spawnIndex][2] as SpawnOptions;
			return env!.N8N_RUNNERS_ID as string;
		};

		const report = (event: (typeof RESTART_EVENTS)[number], runnerId: string) => {
			runnerLifecycleEvents.emit(event, { runnerId });
		};

		const reportUnresponsive = (runnerId: string) => {
			report('runner:unresponsive', runnerId);
		};

		it.each(RESTART_EVENTS)(
			'should force-kill and relaunch on %s the runner it spawned',
			async (event) => {
				const child = createChildProcess(42);
				spawnMock.mockReturnValue(child);
				await taskRunnerProcess.start();

				report(event, assignedRunnerId(0));

				// a runner with a blocked event loop never exits on its own
				expect(child.kill).toHaveBeenCalledWith('SIGKILL');

				child.emit('exit', null);
				await vi.advanceTimersByTimeAsync(0);

				expect(spawnMock).toHaveBeenCalledTimes(2);
			},
		);

		it('should ignore a report once shutdown has begun', async () => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();

			const stopPromise = taskRunnerProcess.stop();
			reportUnresponsive(assignedRunnerId(0));

			expect(child.kill).not.toHaveBeenCalledWith('SIGKILL');

			child.emit('exit', 0);
			await stopPromise;
			await vi.advanceTimersByTimeAsync(10_000);

			expect(spawnMock).toHaveBeenCalledTimes(1);
		});

		it.each(RESTART_EVENTS)('should ignore %s for another runner', async (event) => {
			const child = createChildProcess(42);
			spawnMock.mockReturnValue(child);
			await taskRunnerProcess.start();

			report(event, 'someone-elses-runner');

			expect(child.kill).not.toHaveBeenCalled();
			expect(spawnMock).toHaveBeenCalledTimes(1);
		});

		it('should ignore a report for the runner it replaced', async () => {
			const replaced = createChildProcess(42);
			const relaunched = createChildProcess(43);
			spawnMock.mockReturnValueOnce(replaced).mockReturnValueOnce(relaunched);
			await taskRunnerProcess.start();
			const replacedRunnerId = assignedRunnerId(0);

			replaced.emit('exit', null);
			await vi.advanceTimersByTimeAsync(0);

			reportUnresponsive(replacedRunnerId);

			expect(relaunched.kill).not.toHaveBeenCalled();
			expect(assignedRunnerId(1)).not.toBe(replacedRunnerId);
		});
	});

	describe('restartRetryDelay', () => {
		it('should double the delay up to a ceiling', () => {
			expect([1, 2, 3, 4, 5, 6].map(restartRetryDelay)).toEqual([
				5_000, 10_000, 20_000, 30_000, 30_000, 30_000,
			]);
		});
	});
});
