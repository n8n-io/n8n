'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const task_runner_disconnected_error_1 = require('../task-runner-disconnected-error');
describe('TaskRunnerDisconnectedError', () => {
	it('should have the correct default error message', () => {
		const error = new task_runner_disconnected_error_1.TaskRunnerDisconnectedError(
			'test-runner-id',
			false,
		);
		expect(error.message).toBe('Node execution failed');
	});
	it('should have the error level set to "error"', () => {
		const error = new task_runner_disconnected_error_1.TaskRunnerDisconnectedError(
			'test-runner-id',
			false,
		);
		expect(error.level).toBe('error');
	});
	it('should set the correct description for non-cloud deployments', () => {
		const error = new task_runner_disconnected_error_1.TaskRunnerDisconnectedError(
			'test-runner-id',
			false,
		);
		expect(error.description).toContain(
			'This can happen for various reasons. Please try executing the node again.',
		);
		expect(error.description).toContain(
			'1. Reduce the number of items processed at a time, by batching them using a loop node',
		);
		expect(error.description).toContain(
			"2. Increase the memory available to the task runner with 'N8N_RUNNERS_MAX_OLD_SPACE_SIZE' environment variable",
		);
		expect(error.description).not.toContain(
			'Upgrade your cloud plan to increase the available memory',
		);
	});
	it('should set the correct description for cloud deployments', () => {
		const error = new task_runner_disconnected_error_1.TaskRunnerDisconnectedError(
			'test-runner-id',
			true,
		);
		expect(error.description).toContain(
			'This can happen for various reasons. Please try executing the node again.',
		);
		expect(error.description).toContain(
			'1. Reduce the number of items processed at a time, by batching them using a loop node',
		);
		expect(error.description).toContain(
			'2. Upgrade your cloud plan to increase the available memory',
		);
		expect(error.description).not.toContain(
			"Increase the memory available to the task runner with 'N8N_RUNNERS_MAX_OLD_SPACE_SIZE' environment variable",
		);
	});
});
//# sourceMappingURL=task-runner-disconnected-error.test.js.map
