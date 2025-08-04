'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AbortedExecutionRetryError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class AbortedExecutionRetryError extends n8n_workflow_1.UnexpectedError {
	constructor() {
		super('The execution was aborted before starting, so it cannot be retried');
	}
}
exports.AbortedExecutionRetryError = AbortedExecutionRetryError;
//# sourceMappingURL=aborted-execution-retry.error.js.map
