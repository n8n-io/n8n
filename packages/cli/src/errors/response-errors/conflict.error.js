'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ConflictError = void 0;
const response_error_1 = require('./abstract/response.error');
class ConflictError extends response_error_1.ResponseError {
	constructor(message, hint = undefined) {
		super(message, 409, 409, hint);
	}
}
exports.ConflictError = ConflictError;
//# sourceMappingURL=conflict.error.js.map
