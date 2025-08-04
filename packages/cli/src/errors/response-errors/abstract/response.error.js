'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ResponseError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class ResponseError extends n8n_workflow_1.BaseError {
	constructor(message, httpStatusCode, errorCode = httpStatusCode, hint = undefined, cause) {
		super(message, { cause });
		this.httpStatusCode = httpStatusCode;
		this.errorCode = errorCode;
		this.hint = hint;
		this.name = 'ResponseError';
		if (httpStatusCode >= 400 && httpStatusCode < 500) {
			this.level = 'warning';
		} else if (httpStatusCode >= 502 && httpStatusCode <= 504) {
			this.level = 'info';
		} else {
			this.level = 'error';
		}
	}
}
exports.ResponseError = ResponseError;
//# sourceMappingURL=response.error.js.map
