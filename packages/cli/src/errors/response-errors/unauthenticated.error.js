'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.UnauthenticatedError = void 0;
const response_error_1 = require('./abstract/response.error');
class UnauthenticatedError extends response_error_1.ResponseError {
	constructor(message = 'Unauthenticated', hint) {
		super(message, 401, 401, hint);
	}
}
exports.UnauthenticatedError = UnauthenticatedError;
//# sourceMappingURL=unauthenticated.error.js.map
