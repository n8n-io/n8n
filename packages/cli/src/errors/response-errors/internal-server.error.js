'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.InternalServerError = void 0;
const response_error_1 = require('./abstract/response.error');
class InternalServerError extends response_error_1.ResponseError {
	constructor(message, cause) {
		super(message ? message : 'Internal Server Error', 500, 500, undefined, cause);
	}
}
exports.InternalServerError = InternalServerError;
//# sourceMappingURL=internal-server.error.js.map
