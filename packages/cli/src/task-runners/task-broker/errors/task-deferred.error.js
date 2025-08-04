'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TaskDeferredError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class TaskDeferredError extends n8n_workflow_1.UserError {
	constructor() {
		super('Task deferred until runner is ready');
	}
}
exports.TaskDeferredError = TaskDeferredError;
//# sourceMappingURL=task-deferred.error.js.map
