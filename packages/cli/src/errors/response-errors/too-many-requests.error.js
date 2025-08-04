'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TooManyRequestsError = void 0;
const response_error_1 = require('./abstract/response.error');
class TooManyRequestsError extends response_error_1.ResponseError {
	constructor(message, hint = undefined) {
		super(message, 429, 429, hint);
	}
}
exports.TooManyRequestsError = TooManyRequestsError;
//# sourceMappingURL=too-many-requests.error.js.map
