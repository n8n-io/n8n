'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkflowMissingIdError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class WorkflowMissingIdError extends n8n_workflow_1.UnexpectedError {
	constructor(workflow) {
		super('Detected ID-less worklfow', { extra: { workflow } });
	}
}
exports.WorkflowMissingIdError = WorkflowMissingIdError;
//# sourceMappingURL=workflow-missing-id.error.js.map
