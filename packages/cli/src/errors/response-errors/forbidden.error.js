'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ForbiddenError = void 0;
const response_error_1 = require('./abstract/response.error');
class ForbiddenError extends response_error_1.ResponseError {
	constructor(message = 'Forbidden', hint) {
		super(message, 403, 403, hint);
	}
}
exports.ForbiddenError = ForbiddenError;
//# sourceMappingURL=forbidden.error.js.map
