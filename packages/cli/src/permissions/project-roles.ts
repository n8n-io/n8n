import type { Scope } from '@n8n/permissions';

export const REGULAR_PROJECT_ADMIN_SCOPES: Scope[] = [
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:list',
	'workflow:execute',
	'credential:create',
	'credential:read',
	'credential:delete',
	'credential:list',
];

// TODO
export const PERSONAL_PROJECT_ADMIN_SCOPES: Scope[] = [
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:list',
	'workflow:execute',
	'workflow:share',
	'credential:create',
	'credential:read',
	'credential:delete',
	'credential:list',
	'credential:share',
];

export const PROJECT_EDITOR_SCOPES: Scope[] = [
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:list',
	'workflow:execute',
	'credential:create',
	'credential:read',
	'credential:delete',
	'credential:list',
];

export const PROJECT_VIEWER_SCOPES: Scope[] = [
	'workflow:read',
	'workflow:list',
	'credential:read',
	'credential:list',
];

/**
 * Diff between admin in personal project and admin in other projects:
 * - You cannot rename your personal project.
 * - You cannot invite people to your personal project.
 */
