'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.InvalidMfaCodeError = void 0;
const forbidden_error_1 = require('./forbidden.error');
class InvalidMfaCodeError extends forbidden_error_1.ForbiddenError {
	constructor(hint) {
		super('Invalid two-factor code.', hint);
	}
}
exports.InvalidMfaCodeError = InvalidMfaCodeError;
//# sourceMappingURL=invalid-mfa-code.error.js.map
