'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MalformedRefreshValueError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class MalformedRefreshValueError extends n8n_workflow_1.UnexpectedError {
	constructor() {
		super('Refresh value must have the same number of values as keys');
	}
}
exports.MalformedRefreshValueError = MalformedRefreshValueError;
//# sourceMappingURL=malformed-refresh-value.error.js.map
