'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const config_1 = require('@n8n/config');
const jest_mock_extended_1 = require('jest-mock-extended');
const task_runner_restart_loop_error_1 = require('@/task-runners/errors/task-runner-restart-loop-error');
const task_runner_lifecycle_events_1 = require('@/task-runners/task-runner-lifecycle-events');
const task_runner_process_1 = require('@/task-runners/task-runner-process');
const task_runner_process_restart_loop_detector_1 = require('@/task-runners/task-runner-process-restart-loop-detector');
describe('TaskRunnerProcessRestartLoopDetector', () => {
	const mockLogger = (0, jest_mock_extended_1.mock)();
	const mockAuthService = (0, jest_mock_extended_1.mock)();
	const runnerConfig = new config_1.TaskRunnersConfig();
	const taskRunnerProcess = new task_runner_process_1.TaskRunnerProcess(
		mockLogger,
		runnerConfig,
		mockAuthService,
		new task_runner_lifecycle_events_1.TaskRunnerLifecycleEvents(),
	);
	it('should detect a restart loop if process exits 5 times within 5s', () => {
		const restartLoopDetector =
			new task_runner_process_restart_loop_detector_1.TaskRunnerProcessRestartLoopDetector(
				taskRunnerProcess,
			);
		let emittedError = undefined;
		restartLoopDetector.on('restart-loop-detected', (error) => {
			emittedError = error;
		});
		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');
		taskRunnerProcess.emit('exit');
		expect(emittedError).toBeInstanceOf(
			task_runner_restart_loop_error_1.TaskRunnerRestartLoopError,
		);
	});
	it('should not detect a restart loop if process exits less than 5 times within 5s', () => {
		jest.useFakeTimers();
		const restartLoopDetector =
			new task_runner_process_restart_loop_detector_1.TaskRunnerProcessRestartLoopDetector(
				taskRunnerProcess,
			);
		let emittedError = undefined;
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
//# sourceMappingURL=task-runner-process-restart-loop-detector.test.js.map
