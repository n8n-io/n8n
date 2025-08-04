'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.DeduplicationError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class DeduplicationError extends n8n_workflow_1.UnexpectedError {
	constructor(message) {
		super(`Deduplication Failed: ${message}`);
	}
}
exports.DeduplicationError = DeduplicationError;
//# sourceMappingURL=deduplication.error.js.map
