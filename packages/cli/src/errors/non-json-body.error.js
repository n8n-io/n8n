'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NonJsonBodyError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class NonJsonBodyError extends n8n_workflow_1.UserError {
	constructor() {
		super('Body must be valid JSON. Please make sure `content-type` is `application/json`.');
	}
}
exports.NonJsonBodyError = NonJsonBodyError;
//# sourceMappingURL=non-json-body.error.js.map
