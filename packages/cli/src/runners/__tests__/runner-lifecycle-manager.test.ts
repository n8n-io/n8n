import type { TaskRunnersConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import type { RunnerLifecycleEvents } from '../runner-lifecycle-manager';
import { RunnerLifecycleManager } from '../runner-lifecycle-manager';
import { TaskRunnerProcess } from '../task-runner-process';

describe('RunnerLifecycleManager', () => {
	describe('constructor', () => {
		['internal_childprocess', 'internal_launcher'].forEach((mode: TaskRunnersConfig['mode']) => {
			it(`should start idle checks in \`${mode}\` mode`, () => {
				const taskRunnerProcess = mock<TaskRunnerProcess>();
				const runnerConfig = mock<TaskRunnersConfig>({ mode });

				jest.mock('@/runners/task-runner-process', () => ({ TaskRunnerProcess }));

				jest
					// @ts-expect-error Private method
					.spyOn(RunnerLifecycleManager.prototype, 'startIdleChecks')
					.mockImplementation();

				const lifecycleManager = new RunnerLifecycleManager(
					mock(),
					taskRunnerProcess,
					runnerConfig,
					mock(),
				);

				// @ts-expect-error Private method
				expect(lifecycleManager.startIdleChecks).toHaveBeenCalled();
			});
		});

		it('should fail on `external` mode', () => {
			const taskRunnerProcess = mock<TaskRunnerProcess>();
			const runnerConfig = mock<TaskRunnersConfig>({ mode: 'external' });

			jest.mock('@/runners/task-runner-process', () => ({ TaskRunnerProcess }));

			expect(() => {
				new RunnerLifecycleManager(mock(), taskRunnerProcess, runnerConfig, mock());
			}).toThrowError('Runner mode must be `internal_childprocess` or `internal_launcher`');
		});
	});

	describe('ensureRunnerAvailable', () => {
		it('should return early is runner is already running', async () => {
			const taskRunnerProcess = mock<TaskRunnerProcess>();
			const runnerConfig = mock<TaskRunnersConfig>({ mode: 'internal_childprocess' });
			const lifecycleManager = new RunnerLifecycleManager(
				mock(),
				taskRunnerProcess,
				runnerConfig,
				mock(),
			);

			await lifecycleManager.ensureRunnerAvailable(); // first call to start the runner

			jest.clearAllMocks();

			await lifecycleManager.ensureRunnerAvailable(); // second call should return early

			expect(taskRunnerProcess.start).not.toHaveBeenCalled(); // process was not started again
		});

		it('should return the start promise if runner is already in the process of starting', async () => {
			const taskRunnerProcess = mock<TaskRunnerProcess>();
			const runnerConfig = mock<TaskRunnersConfig>({ mode: 'internal_childprocess' });

			// mock a delayed start to simulate long-running process
			let resolveStart: () => void;
			const startPromise = new Promise<void>((resolve) => {
				resolveStart = resolve;
			});
			taskRunnerProcess.start.mockReturnValue(startPromise);

			const lifecycleManager = new RunnerLifecycleManager(
				mock(),
				taskRunnerProcess,
				runnerConfig,
				mock(),
			);

			const firstCallPromise = lifecycleManager.ensureRunnerAvailable(); // start without awaiting
			const secondCallPromise = lifecycleManager.ensureRunnerAvailable();

			expect(firstCallPromise).toEqual(secondCallPromise);

			resolveStart!();

			await Promise.all([firstCallPromise, secondCallPromise]);

			expect(taskRunnerProcess.start).toHaveBeenCalledTimes(1);
		});

		it('should start the runner if it is currently stopped', async () => {
			const taskRunnerProcess = mock<TaskRunnerProcess>();
			const runnerConfig = mock<TaskRunnersConfig>({ mode: 'internal_childprocess' });
			const lifecycleEvents = mock<RunnerLifecycleEvents>();

			const lifecycleManager = new RunnerLifecycleManager(
				mock(),
				taskRunnerProcess,
				runnerConfig,
				lifecycleEvents,
			);

			// set up stopped state
			await lifecycleManager.ensureRunnerAvailable();
			expect(taskRunnerProcess.start).toHaveBeenCalledTimes(1);
			expect(lifecycleEvents.emit).toHaveBeenCalledWith('runner:started');

			jest.clearAllMocks();

			const shutdownPromise = lifecycleManager.shutdown(); // simulate stopping state

			// try to start while stopping
			const startPromise = lifecycleManager.ensureRunnerAvailable();

			await shutdownPromise;

			await startPromise;

			expect(taskRunnerProcess.start).toHaveBeenCalledTimes(1);
			expect(lifecycleEvents.emit).toHaveBeenCalledWith('runner:started');
		});
	});

	describe('updateLastActivityTime', () => {
		it('should update last activity timestamp', () => {
			const mockNow = 1234567890;
			jest.spyOn(Date, 'now').mockReturnValue(mockNow);

			const lifecycleManager = new RunnerLifecycleManager(
				mock(),
				mock<TaskRunnerProcess>(),
				mock<TaskRunnersConfig>({ mode: 'internal_childprocess' }),
				mock(),
			);

			lifecycleManager.updateLastActivityTime();

			// @ts-expect-error Private property
			expect(lifecycleManager.lastActivityTime).toBe(mockNow);
		});
	});

	describe('shutdown', () => {
		it('should stop the runner and clear idle checks interval', async () => {
			jest.useFakeTimers();

			const taskRunnerProcess = mock<TaskRunnerProcess>();
			const lifecycleEvents = mock<RunnerLifecycleEvents>();
			const lifecycleManager = new RunnerLifecycleManager(
				mock(),
				taskRunnerProcess,
				mock<TaskRunnersConfig>({ mode: 'internal_childprocess' }),
				lifecycleEvents,
			);

			await lifecycleManager.ensureRunnerAvailable();

			jest.clearAllMocks();

			await lifecycleManager.shutdown();

			expect(taskRunnerProcess.stop).toHaveBeenCalled();
			expect(lifecycleEvents.emit).toHaveBeenCalledWith('runner:stopped');

			jest.advanceTimersByTime(1);
			expect(taskRunnerProcess.stop).toHaveBeenCalledTimes(1);

			jest.useRealTimers();
		});

		it('should do nothing if runner is already stopped', async () => {
			const taskRunnerProcess = mock<TaskRunnerProcess>();
			const lifecycleEvents = mock<RunnerLifecycleEvents>();
			const lifecycleManager = new RunnerLifecycleManager(
				mock(),
				taskRunnerProcess,
				mock<TaskRunnersConfig>({ mode: 'internal_childprocess' }),
				lifecycleEvents,
			);

			await lifecycleManager.shutdown();

			expect(taskRunnerProcess.stop).not.toHaveBeenCalled();
			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});
	});
});
