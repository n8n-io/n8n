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
	'project:personalOwner': 'Project Owner',
	'project:admin': 'Project Admin',
	'project:editor': 'Project Editor',
	'project:viewer': 'Project Viewer',
	'credential:user': 'Credential User',
	'credential:owner': 'Credential Owner',
	'workflow:owner': 'Workflow Owner',
	'workflow:editor': 'Workflow Editor',
};

const mapToRoleObject = <T extends keyof typeof ROLE_NAMES>(roles: Record<T, Scope[]>) =>
	(Object.keys(roles) as T[]).map((role) => ({
		role,
		name: ROLE_NAMES[role],
		scopes: getRoleScopes(role),
		licensed: false,
	}));

export const ALL_ROLES: AllRolesMap = {
	global: mapToRoleObject(GLOBAL_SCOPE_MAP),
	project: mapToRoleObject(PROJECT_SCOPE_MAP),
	credential: mapToRoleObject(CREDENTIALS_SHARING_SCOPE_MAP),
	workflow: mapToRoleObject(WORKFLOW_SHARING_SCOPE_MAP),
};
