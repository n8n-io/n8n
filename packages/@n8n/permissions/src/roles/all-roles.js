'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isBuiltInRole = exports.ALL_ROLES = void 0;
const constants_ee_1 = require('../constants.ee');
const role_maps_ee_1 = require('./role-maps.ee');
const get_role_scopes_ee_1 = require('../utilities/get-role-scopes.ee');
const ROLE_NAMES = {
	'global:owner': 'Owner',
	'global:admin': 'Admin',
	'global:member': 'Member',
	[constants_ee_1.PROJECT_OWNER_ROLE_SLUG]: 'Project Owner',
	[constants_ee_1.PROJECT_ADMIN_ROLE_SLUG]: 'Project Admin',
	[constants_ee_1.PROJECT_EDITOR_ROLE_SLUG]: 'Project Editor',
	[constants_ee_1.PROJECT_VIEWER_ROLE_SLUG]: 'Project Viewer',
	'credential:user': 'Credential User',
	'credential:owner': 'Credential Owner',
	'workflow:owner': 'Workflow Owner',
	'workflow:editor': 'Workflow Editor',
};
const ROLE_DESCRIPTIONS = {
	'global:owner': 'Owner',
	'global:admin': 'Admin',
	'global:member': 'Member',
	[constants_ee_1.PROJECT_OWNER_ROLE_SLUG]: 'Project Owner',
	[constants_ee_1.PROJECT_ADMIN_ROLE_SLUG]:
		'Full control of settings, members, workflows, credentials and executions',
	[constants_ee_1.PROJECT_EDITOR_ROLE_SLUG]:
		'Create, edit, and delete workflows, credentials, and executions',
	[constants_ee_1.PROJECT_VIEWER_ROLE_SLUG]:
		'Read-only access to workflows, credentials, and executions',
	'credential:user': 'Credential User',
	'credential:owner': 'Credential Owner',
	'workflow:owner': 'Workflow Owner',
	'workflow:editor': 'Workflow Editor',
};
const mapToRoleObject = (roles, roleType) =>
	Object.keys(roles).map((role) => ({
		slug: role,
		displayName: ROLE_NAMES[role],
		scopes: (0, get_role_scopes_ee_1.getRoleScopes)(role),
		description: ROLE_DESCRIPTIONS[role],
		licensed: false,
		systemRole: true,
		roleType,
	}));
exports.ALL_ROLES = {
	global: mapToRoleObject(role_maps_ee_1.GLOBAL_SCOPE_MAP, 'global'),
	project: mapToRoleObject(role_maps_ee_1.PROJECT_SCOPE_MAP, 'project'),
	credential: mapToRoleObject(role_maps_ee_1.CREDENTIALS_SHARING_SCOPE_MAP, 'credential'),
	workflow: mapToRoleObject(role_maps_ee_1.WORKFLOW_SHARING_SCOPE_MAP, 'workflow'),
};
const isBuiltInRole = (role) => {
	return Object.prototype.hasOwnProperty.call(ROLE_NAMES, role);
};
exports.isBuiltInRole = isBuiltInRole;
//# sourceMappingURL=all-roles.js.map
