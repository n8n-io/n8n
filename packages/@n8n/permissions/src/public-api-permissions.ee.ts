import type { ApiKeyScope, GlobalRole } from './types.ee';

export const OWNER_API_KEY_SCOPES: ApiKeyScope[] = [
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
	'execution:list',
	'credential:create',
	'credential:move',
	'credential:delete',
];

export const ADMIN_API_KEY_SCOPES: ApiKeyScope[] = OWNER_API_KEY_SCOPES;

export const MEMBER_API_KEY_SCOPES: ApiKeyScope[] = [
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
	'execution:list',
	'credential:create',
	'credential:move',
	'credential:delete',
];

const MAP_ROLE_SCOPES: Record<GlobalRole, ApiKeyScope[]> = {
	'global:owner': OWNER_API_KEY_SCOPES,
	'global:admin': ADMIN_API_KEY_SCOPES,
	'global:member': MEMBER_API_KEY_SCOPES,
};

export const getApiKeyScopesForRole = (role: GlobalRole) => {
	return MAP_ROLE_SCOPES[role];
};

export const getOwnerOnlyApiKeyScopes = () => {
	const ownerScopes = new Set<ApiKeyScope>(MAP_ROLE_SCOPES['global:owner']);
	const memberScopes = new Set<ApiKeyScope>(MAP_ROLE_SCOPES['global:member']);
	memberScopes.forEach((item) => ownerScopes.delete(item));
	return Array.from(ownerScopes);
};
