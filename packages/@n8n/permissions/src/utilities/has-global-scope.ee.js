'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.hasGlobalScope = void 0;
const has_scope_ee_1 = require('./has-scope.ee');
const get_role_scopes_ee_1 = require('./get-role-scopes.ee');
const hasGlobalScope = (principal, scope, scopeOptions) => {
	const global = (0, get_role_scopes_ee_1.getAuthPrincipalScopes)(principal);
	return (0, has_scope_ee_1.hasScope)(scope, { global }, undefined, scopeOptions);
};
exports.hasGlobalScope = hasGlobalScope;
//# sourceMappingURL=has-global-scope.ee.js.map
