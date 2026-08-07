'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createAuthPrincipal = createAuthPrincipal;
const role_maps_ee_1 = require('@/roles/role-maps.ee');
const schemas_ee_1 = require('@/schemas.ee');
function createBuildInAuthPrincipal(role) {
	return {
		role: {
			slug: role,
			scopes:
				role_maps_ee_1.GLOBAL_SCOPE_MAP[role].map((scope) => {
					return {
						slug: scope,
					};
				}) || [],
		},
	};
}
function createAuthPrincipal(role, scopes = []) {
	try {
		const isGlobalRole = schemas_ee_1.globalRoleSchema.parse(role);
		if (isGlobalRole) {
			return createBuildInAuthPrincipal(isGlobalRole);
		}
	} catch (error) {}
	return {
		role: {
			slug: role,
			scopes:
				scopes.map((scope) => {
					return {
						slug: scope,
					};
				}) || [],
		},
	};
}
//# sourceMappingURL=utils.js.map
