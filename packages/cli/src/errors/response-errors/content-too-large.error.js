'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ContentTooLargeError = void 0;
const response_error_1 = require('./abstract/response.error');
class ContentTooLargeError extends response_error_1.ResponseError {
	constructor(message, hint = undefined) {
		super(message, 413, 413, hint);
	}
}
exports.ContentTooLargeError = ContentTooLargeError;
//# sourceMappingURL=content-too-large.error.js.map
