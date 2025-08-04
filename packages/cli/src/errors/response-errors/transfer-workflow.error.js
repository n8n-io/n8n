'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TransferWorkflowError = void 0;
const response_error_1 = require('./abstract/response.error');
class TransferWorkflowError extends response_error_1.ResponseError {
	constructor(message) {
		super(message, 400, 400);
	}
}
exports.TransferWorkflowError = TransferWorkflowError;
//# sourceMappingURL=transfer-workflow.error.js.map
