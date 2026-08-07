'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.hasScope = void 0;
const combine_scopes_ee_1 = require('./combine-scopes.ee');
const hasScope = (scope, userScopes, masks, options = { mode: 'oneOf' }) => {
	if (!Array.isArray(scope)) scope = [scope];
	const userScopeSet = (0, combine_scopes_ee_1.combineScopes)(userScopes, masks);
	return options.mode === 'allOf'
		? !!scope.length && scope.every((s) => userScopeSet.has(s))
		: scope.some((s) => userScopeSet.has(s));
};
exports.hasScope = hasScope;
//# sourceMappingURL=has-scope.ee.js.map
