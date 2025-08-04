'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkflowCrashedError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class WorkflowCrashedError extends n8n_workflow_1.WorkflowOperationError {
	constructor() {
		super('Workflow did not finish, possible out-of-memory issue');
	}
}
exports.WorkflowCrashedError = WorkflowCrashedError;
//# sourceMappingURL=workflow-crashed.error.js.map
