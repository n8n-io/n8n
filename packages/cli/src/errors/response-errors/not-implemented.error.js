'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NotImplementedError = void 0;
const response_error_1 = require('./abstract/response.error');
class NotImplementedError extends response_error_1.ResponseError {
	constructor(message, hint = undefined) {
		super(message, 501, 501, hint);
	}
}
exports.NotImplementedError = NotImplementedError;
//# sourceMappingURL=not-implemented.error.js.map
