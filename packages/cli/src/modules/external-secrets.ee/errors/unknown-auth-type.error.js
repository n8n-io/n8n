'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.UnknownAuthTypeError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class UnknownAuthTypeError extends n8n_workflow_1.UnexpectedError {
	constructor(authType) {
		super('Unknown auth type', { extra: { authType } });
	}
}
exports.UnknownAuthTypeError = UnknownAuthTypeError;
//# sourceMappingURL=unknown-auth-type.error.js.map
