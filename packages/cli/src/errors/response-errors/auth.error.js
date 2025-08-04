'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AuthError = void 0;
const response_error_1 = require('./abstract/response.error');
class AuthError extends response_error_1.ResponseError {
	constructor(message, errorCode) {
		super(message, 401, errorCode);
	}
}
exports.AuthError = AuthError;
//# sourceMappingURL=auth.error.js.map
