'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.InvalidMfaRecoveryCodeError = void 0;
const forbidden_error_1 = require('./forbidden.error');
class InvalidMfaRecoveryCodeError extends forbidden_error_1.ForbiddenError {
	constructor(hint) {
		super('Invalid MFA recovery code', hint);
	}
}
exports.InvalidMfaRecoveryCodeError = InvalidMfaRecoveryCodeError;
//# sourceMappingURL=invalid-mfa-recovery-code-error.js.map
