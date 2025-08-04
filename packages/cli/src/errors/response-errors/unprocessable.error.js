'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.UnprocessableRequestError = void 0;
const response_error_1 = require('./abstract/response.error');
class UnprocessableRequestError extends response_error_1.ResponseError {
	constructor(message, hint = undefined) {
		super(message, 422, 422, hint);
	}
}
exports.UnprocessableRequestError = UnprocessableRequestError;
//# sourceMappingURL=unprocessable.error.js.map
