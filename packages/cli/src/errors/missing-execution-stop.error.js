'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MissingExecutionStopError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class MissingExecutionStopError extends n8n_workflow_1.UserError {
	constructor(executionId) {
		super('Failed to find execution to stop', { extra: { executionId } });
	}
}
exports.MissingExecutionStopError = MissingExecutionStopError;
//# sourceMappingURL=missing-execution-stop.error.js.map
