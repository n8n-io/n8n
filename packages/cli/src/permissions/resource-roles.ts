import type { Scope } from '@n8n/permissions';

export const CREDENTIALS_SHARING_OWNER_SCOPES: Scope[] = [
	'credential:read',
	'credential:update',
	'credential:delete',
	'credential:share',
];

export const CREDENTIALS_SHARING_USER_SCOPES: Scope[] = ['credential:read'];

export const WORKFLOW_SHARING_OWNER_SCOPES: Scope[] = [
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:execute',
	'workflow:share',
];

export const WORKFLOW_SHARING_EDITOR_SCOPES: Scope[] = [
	'workflow:read',
	'workflow:update',
	'workflow:execute',
];
