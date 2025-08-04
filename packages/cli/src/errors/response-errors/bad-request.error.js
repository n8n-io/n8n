'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.BadRequestError = void 0;
const response_error_1 = require('./abstract/response.error');
class BadRequestError extends response_error_1.ResponseError {
	constructor(message, errorCode) {
		super(message, 400, errorCode);
	}
}
exports.BadRequestError = BadRequestError;
//# sourceMappingURL=bad-request.error.js.map
