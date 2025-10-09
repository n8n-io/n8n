import {
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_EDITOR_ROLE_SLUG,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_VIEWER_ROLE_SLUG,
} from '../constants.ee';
import {
	CREDENTIALS_SHARING_SCOPE_MAP,
	GLOBAL_SCOPE_MAP,
	PROJECT_SCOPE_MAP,
	WORKFLOW_SHARING_SCOPE_MAP,
} from './role-maps.ee';
import type { AllRolesMap, AllRoleTypes, Scope } from '../types.ee';
import { getRoleScopes } from '../utilities/get-role-scopes.ee';

const ROLE_NAMES: Record<AllRoleTypes, string> = {
	'global:owner': 'Owner',
	'global:admin': 'Admin',
	'global:member': 'Member',
	[PROJECT_OWNER_ROLE_SLUG]: 'Project Owner',
	[PROJECT_ADMIN_ROLE_SLUG]: 'Project Admin',
	[PROJECT_EDITOR_ROLE_SLUG]: 'Project Editor',
	[PROJECT_VIEWER_ROLE_SLUG]: 'Project Viewer',
	'credential:user': 'Credential User',
	'credential:owner': 'Credential Owner',
	'workflow:owner': 'Workflow Owner',
	'workflow:editor': 'Workflow Editor',
};

const ROLE_DESCRIPTIONS: Record<AllRoleTypes, string> = {
	'global:owner': 'Owner',
	'global:admin': 'Admin',
	'global:member': 'Member',
	[PROJECT_OWNER_ROLE_SLUG]: 'Project Owner',
	[PROJECT_ADMIN_ROLE_SLUG]:
		'Full control of settings, members, workflows, credentials and executions',
	[PROJECT_EDITOR_ROLE_SLUG]: 'Create, edit, and delete workflows, credentials, and executions',
	[PROJECT_VIEWER_ROLE_SLUG]: 'Read-only access to workflows, credentials, and executions',
	'credential:user': 'Credential User',
	'credential:owner': 'Credential Owner',
	'workflow:owner': 'Workflow Owner',
	'workflow:editor': 'Workflow Editor',
};

const mapToRoleObject = <T extends keyof typeof ROLE_NAMES>(
	roles: Record<T, Scope[]>,
	roleType: 'global' | 'project' | 'credential' | 'workflow',
) =>
	(Object.keys(roles) as T[]).map((role) => ({
		slug: role,
		displayName: ROLE_NAMES[role],
		scopes: getRoleScopes(role),
		description: ROLE_DESCRIPTIONS[role],
		licensed: false,
		systemRole: true,
		roleType,
	}));

export const ALL_ROLES: AllRolesMap = {
	global: mapToRoleObject(GLOBAL_SCOPE_MAP, 'global'),
	project: mapToRoleObject(PROJECT_SCOPE_MAP, 'project'),
	credential: mapToRoleObject(CREDENTIALS_SHARING_SCOPE_MAP, 'credential'),
	workflow: mapToRoleObject(WORKFLOW_SHARING_SCOPE_MAP, 'workflow'),
};

export const isBuiltInRole = (role: string): role is AllRoleTypes => {
	return Object.prototype.hasOwnProperty.call(ROLE_NAMES, role);
};
