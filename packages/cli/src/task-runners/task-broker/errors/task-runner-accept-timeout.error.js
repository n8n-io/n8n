'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TaskRunnerAcceptTimeoutError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class TaskRunnerAcceptTimeoutError extends n8n_workflow_1.OperationalError {
	constructor(taskId, runnerId) {
		super(`Runner (${runnerId}) took too long to acknowledge acceptance of task (${taskId})`, {
			level: 'warning',
		});
	}
}
exports.TaskRunnerAcceptTimeoutError = TaskRunnerAcceptTimeoutError;
//# sourceMappingURL=task-runner-accept-timeout.error.js.map
