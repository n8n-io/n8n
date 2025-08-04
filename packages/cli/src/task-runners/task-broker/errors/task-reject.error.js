'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TaskRejectError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class TaskRejectError extends n8n_workflow_1.UserError {
	constructor(reason) {
		super(`Task rejected with reason: ${reason}`);
		this.reason = reason;
	}
}
exports.TaskRejectError = TaskRejectError;
//# sourceMappingURL=task-reject.error.js.map
