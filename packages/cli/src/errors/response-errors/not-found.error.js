'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NotFoundError = void 0;
const response_error_1 = require('./abstract/response.error');
class NotFoundError extends response_error_1.ResponseError {
	static isDefinedAndNotNull(value, message, hint) {
		if (value === undefined || value === null) {
			throw new NotFoundError(message, hint);
		}
	}
	constructor(message, hint = undefined) {
		super(message, 404, 404, hint);
	}
}
exports.NotFoundError = NotFoundError;
//# sourceMappingURL=not-found.error.js.map
