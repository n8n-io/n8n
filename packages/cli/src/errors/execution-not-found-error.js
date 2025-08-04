'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExecutionNotFoundError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class ExecutionNotFoundError extends n8n_workflow_1.UnexpectedError {
	constructor(executionId) {
		super('No active execution found', { extra: { executionId } });
	}
}
exports.ExecutionNotFoundError = ExecutionNotFoundError;
//# sourceMappingURL=execution-not-found-error.js.map
