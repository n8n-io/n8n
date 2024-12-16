import { TaskRunnersConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import type { Logger } from '@/logging/logger.service';
import type { TaskRunnerAuthService } from '@/runners/auth/task-runner-auth.service';
import { TaskRunnerRestartLoopError } from '@/runners/errors/task-runner-restart-loop-error';
import { RunnerLifecycleEvents } from '@/runners/runner-lifecycle-events';
import { TaskRunnerProcess } from '@/runners/task-runner-process';
import { TaskRunnerProcessRestartLoopDetector } from '@/runners/task-runner-process-restart-loop-detector';

describe('TaskRunnerProcessRestartLoopDetector', () => {
	const mockLogger = mock<Logger>();
	const mockAuthService = mock<TaskRunnerAuthService>();
	const runnerConfig = new TaskRunnersConfig();
	const taskRunnerProcess = new TaskRunnerProcess(
		mockLogger,
		runnerConfig,
		mockAuthService,
		new RunnerLifecycleEvents(),
	);

	it('should detect a restart loop if process exits 5 times within 5s', () => {
		const restartLoopDetector = new TaskRunnerProcessRestartLoopDetector(taskRunnerProcess);
		let emittedError: TaskRunnerRestartLoopError | undefined = undefined;
		restartLoopDetector.on('restart-loop-detected', (error) => {
			emittedError = error;
		});

		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');

		expect(emittedError).toBeInstanceOf(TaskRunnerRestartLoopError);
	});

	it('should not detect a restart loop if process exits less than 5 times within 5s', () => {
		jest.useFakeTimers();
		const restartLoopDetector = new TaskRunnerProcessRestartLoopDetector(taskRunnerProcess);
		let emittedError: TaskRunnerRestartLoopError | undefined = undefined;
		restartLoopDetector.on('restart-loop-detected', (error) => {
			emittedError = error;
		});

		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');

		jest.advanceTimersByTime(5010);

		taskRunnerProcess.emit('exit');

		expect(emittedError).toBeUndefined();
	});
});
