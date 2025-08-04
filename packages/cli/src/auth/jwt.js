'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.issueCookie = issueCookie;
const di_1 = require('@n8n/di');
const auth_service_1 = require('./auth.service');
function issueCookie(res, user) {
	return di_1.Container.get(auth_service_1.AuthService).issueCookie(res, user, user.mfaEnabled);
}
//# sourceMappingURL=jwt.js.map
