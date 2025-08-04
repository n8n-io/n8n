'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.UncacheableValueError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class UncacheableValueError extends n8n_workflow_1.UnexpectedError {
	constructor(key) {
		super('Value cannot be cached in Redis', {
			extra: { key, hint: 'Does the value contain circular references?' },
		});
	}
}
exports.UncacheableValueError = UncacheableValueError;
//# sourceMappingURL=uncacheable-value.error.js.map
