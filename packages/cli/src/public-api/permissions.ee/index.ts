import type { ApiKeyScope, GlobalRole } from '@n8n/permissions';

import {
	ADMIN_API_KEY_SCOPES,
	MEMBER_API_KEY_SCOPES,
	OWNER_API_KEY_SCOPES,
} from './global-roles-scopes';

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
