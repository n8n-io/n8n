'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TransferCredentialError = void 0;
const response_error_1 = require('./abstract/response.error');
class TransferCredentialError extends response_error_1.ResponseError {
	constructor(message) {
		super(message, 400, 400);
	}
}
exports.TransferCredentialError = TransferCredentialError;
//# sourceMappingURL=transfer-credential.error.js.map
