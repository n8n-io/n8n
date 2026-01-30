'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isAssignableProjectRoleSlug = isAssignableProjectRoleSlug;
exports.isApiKeyScope = isApiKeyScope;
const constants_ee_1 = require('./constants.ee');
const scope_information_1 = require('./scope-information');
function isAssignableProjectRoleSlug(slug) {
	return slug.startsWith('project:') && slug !== constants_ee_1.PROJECT_OWNER_ROLE_SLUG;
}
function isApiKeyScope(scope) {
	return scope_information_1.ALL_API_KEY_SCOPES.has(scope);
}
//# sourceMappingURL=types.ee.js.map
