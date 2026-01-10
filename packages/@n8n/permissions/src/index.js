'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __exportStar =
	(this && this.__exportStar) ||
	function (m, exports) {
		for (var p in m)
			if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p))
				__createBinding(exports, m, p);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.getResourcePermissions =
	exports.getAuthPrincipalScopes =
	exports.getRoleScopes =
	exports.getGlobalScopes =
	exports.staticRolesWithScope =
	exports.combineScopes =
	exports.hasGlobalScope =
	exports.hasScope =
	exports.scopeSchema =
	exports.roleSchema =
	exports.teamRoleSchema =
	exports.projectRoleSchema =
	exports.assignableGlobalRoleSchema =
	exports.assignableProjectRoleSchema =
	exports.systemProjectRoleSchema =
		void 0;
__exportStar(require('./types.ee'), exports);
__exportStar(require('./constants.ee'), exports);
__exportStar(require('./roles/scopes/global-scopes.ee'), exports);
__exportStar(require('./scope-information'), exports);
__exportStar(require('./roles/role-maps.ee'), exports);
__exportStar(require('./roles/all-roles'), exports);
var schemas_ee_1 = require('./schemas.ee');
Object.defineProperty(exports, 'systemProjectRoleSchema', {
	enumerable: true,
	get: function () {
		return schemas_ee_1.systemProjectRoleSchema;
	},
});
Object.defineProperty(exports, 'assignableProjectRoleSchema', {
	enumerable: true,
	get: function () {
		return schemas_ee_1.assignableProjectRoleSchema;
	},
});
Object.defineProperty(exports, 'assignableGlobalRoleSchema', {
	enumerable: true,
	get: function () {
		return schemas_ee_1.assignableGlobalRoleSchema;
	},
});
Object.defineProperty(exports, 'projectRoleSchema', {
	enumerable: true,
	get: function () {
		return schemas_ee_1.projectRoleSchema;
	},
});
Object.defineProperty(exports, 'teamRoleSchema', {
	enumerable: true,
	get: function () {
		return schemas_ee_1.teamRoleSchema;
	},
});
Object.defineProperty(exports, 'roleSchema', {
	enumerable: true,
	get: function () {
		return schemas_ee_1.roleSchema;
	},
});
Object.defineProperty(exports, 'scopeSchema', {
	enumerable: true,
	get: function () {
		return schemas_ee_1.scopeSchema;
	},
});
var has_scope_ee_1 = require('./utilities/has-scope.ee');
Object.defineProperty(exports, 'hasScope', {
	enumerable: true,
	get: function () {
		return has_scope_ee_1.hasScope;
	},
});
var has_global_scope_ee_1 = require('./utilities/has-global-scope.ee');
Object.defineProperty(exports, 'hasGlobalScope', {
	enumerable: true,
	get: function () {
		return has_global_scope_ee_1.hasGlobalScope;
	},
});
var combine_scopes_ee_1 = require('./utilities/combine-scopes.ee');
Object.defineProperty(exports, 'combineScopes', {
	enumerable: true,
	get: function () {
		return combine_scopes_ee_1.combineScopes;
	},
});
var static_roles_with_scope_ee_1 = require('./utilities/static-roles-with-scope.ee');
Object.defineProperty(exports, 'staticRolesWithScope', {
	enumerable: true,
	get: function () {
		return static_roles_with_scope_ee_1.staticRolesWithScope;
	},
});
var get_global_scopes_ee_1 = require('./utilities/get-global-scopes.ee');
Object.defineProperty(exports, 'getGlobalScopes', {
	enumerable: true,
	get: function () {
		return get_global_scopes_ee_1.getGlobalScopes;
	},
});
var get_role_scopes_ee_1 = require('./utilities/get-role-scopes.ee');
Object.defineProperty(exports, 'getRoleScopes', {
	enumerable: true,
	get: function () {
		return get_role_scopes_ee_1.getRoleScopes;
	},
});
Object.defineProperty(exports, 'getAuthPrincipalScopes', {
	enumerable: true,
	get: function () {
		return get_role_scopes_ee_1.getAuthPrincipalScopes;
	},
});
var get_resource_permissions_ee_1 = require('./utilities/get-resource-permissions.ee');
Object.defineProperty(exports, 'getResourcePermissions', {
	enumerable: true,
	get: function () {
		return get_resource_permissions_ee_1.getResourcePermissions;
	},
});
__exportStar(require('./public-api-permissions.ee'), exports);
//# sourceMappingURL=index.js.map
