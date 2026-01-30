'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getOwnerOnlyApiKeyScopes =
	exports.getApiKeyScopesForRole =
	exports.API_KEY_SCOPES_FOR_IMPLICIT_PERSONAL_PROJECT =
	exports.MEMBER_API_KEY_SCOPES =
	exports.ADMIN_API_KEY_SCOPES =
	exports.OWNER_API_KEY_SCOPES =
		void 0;
const types_ee_1 = require('./types.ee');
exports.OWNER_API_KEY_SCOPES = [
	'user:read',
	'user:list',
	'user:create',
	'user:changeRole',
	'user:delete',
	'user:enforceMfa',
	'sourceControl:pull',
	'securityAudit:generate',
	'project:create',
	'project:update',
	'project:delete',
	'project:list',
	'variable:create',
	'variable:delete',
	'variable:list',
	'variable:update',
	'tag:create',
	'tag:read',
	'tag:update',
	'tag:delete',
	'tag:list',
	'workflowTags:update',
	'workflowTags:list',
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:list',
	'workflow:move',
	'workflow:activate',
	'workflow:deactivate',
	'execution:delete',
	'execution:read',
	'execution:retry',
	'execution:list',
	'credential:create',
	'credential:move',
	'credential:delete',
];
exports.ADMIN_API_KEY_SCOPES = exports.OWNER_API_KEY_SCOPES;
exports.MEMBER_API_KEY_SCOPES = [
	'tag:create',
	'tag:read',
	'tag:update',
	'tag:list',
	'workflowTags:update',
	'workflowTags:list',
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:list',
	'workflow:move',
	'workflow:activate',
	'workflow:deactivate',
	'execution:delete',
	'execution:read',
	'execution:retry',
	'execution:list',
	'credential:create',
	'credential:move',
	'credential:delete',
];
exports.API_KEY_SCOPES_FOR_IMPLICIT_PERSONAL_PROJECT = [
	'workflowTags:update',
	'workflowTags:list',
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:list',
	'workflow:move',
	'workflow:activate',
	'workflow:deactivate',
	'execution:delete',
	'execution:read',
	'execution:retry',
	'execution:list',
	'credential:create',
	'credential:move',
	'credential:delete',
];
const MAP_ROLE_SCOPES = {
	'global:owner': exports.OWNER_API_KEY_SCOPES,
	'global:admin': exports.ADMIN_API_KEY_SCOPES,
	'global:member': exports.MEMBER_API_KEY_SCOPES,
};
const getApiKeyScopesForRole = (user) => {
	return [
		...new Set(
			user.role.scopes
				.map((scope) => scope.slug)
				.concat(exports.API_KEY_SCOPES_FOR_IMPLICIT_PERSONAL_PROJECT)
				.filter(types_ee_1.isApiKeyScope),
		),
	];
};
exports.getApiKeyScopesForRole = getApiKeyScopesForRole;
const getOwnerOnlyApiKeyScopes = () => {
	const ownerScopes = new Set(MAP_ROLE_SCOPES['global:owner']);
	const memberScopes = new Set(MAP_ROLE_SCOPES['global:member']);
	memberScopes.forEach((item) => ownerScopes.delete(item));
	return Array.from(ownerScopes);
};
exports.getOwnerOnlyApiKeyScopes = getOwnerOnlyApiKeyScopes;
//# sourceMappingURL=public-api-permissions.ee.js.map
