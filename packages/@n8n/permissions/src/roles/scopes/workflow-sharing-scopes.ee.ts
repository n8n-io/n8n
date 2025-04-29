import type { Scope } from '../../types.ee';

export const WORKFLOW_SHARING_OWNER_SCOPES: Scope[] = [
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:execute',
	'workflow:share',
	'workflow:move',
];

export const WORKFLOW_SHARING_EDITOR_SCOPES: Scope[] = [
	'workflow:read',
	'workflow:update',
	'workflow:execute',
];
