'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ServiceUnavailableError = void 0;
const response_error_1 = require('./abstract/response.error');
class ServiceUnavailableError extends response_error_1.ResponseError {
	constructor(message, errorCode = 503) {
		super(message, 503, errorCode);
	}
}
exports.ServiceUnavailableError = ServiceUnavailableError;
//# sourceMappingURL=service-unavailable.error.js.map
