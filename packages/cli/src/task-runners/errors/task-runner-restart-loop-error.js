'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TaskRunnerRestartLoopError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class TaskRunnerRestartLoopError extends n8n_workflow_1.UnexpectedError {
	constructor(howManyTimes, timePeriodMs) {
		const message = `Task runner has restarted ${howManyTimes} times within ${timePeriodMs / 1000} seconds. This is an abnormally high restart rate that suggests a bug or other issue is preventing your runner process from starting up. If this issues persists, please file a report at: https://github.com/n8n-io/n8n/issues`;
		super(message);
		this.howManyTimes = howManyTimes;
		this.timePeriodMs = timePeriodMs;
	}
}
exports.TaskRunnerRestartLoopError = TaskRunnerRestartLoopError;
//# sourceMappingURL=task-runner-restart-loop-error.js.map
