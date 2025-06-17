import type { Scope } from '../../types.ee';

/**
 * Diff between admin in personal project and admin in other projects:
 * - You cannot rename your personal project.
 * - You cannot invite people to your personal project.
 */

export const REGULAR_PROJECT_ADMIN_SCOPES: Scope[] = [
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:list',
	'workflow:execute',
	'workflow:move',
	'credential:create',
	'credential:read',
	'credential:update',
	'credential:delete',
	'credential:list',
	'credential:move',
	'credential:share',
	'project:list',
	'project:read',
	'project:update',
	'project:delete',
	'folder:create',
	'folder:read',
	'folder:update',
	'folder:delete',
	'folder:list',
	'folder:move',
	'sourceControl:push',
];

export const PERSONAL_PROJECT_OWNER_SCOPES: Scope[] = [
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:list',
	'workflow:execute',
	'workflow:share',
	'workflow:move',
	'credential:create',
	'credential:read',
	'credential:update',
	'credential:delete',
	'credential:list',
	'credential:share',
	'credential:move',
	'project:list',
	'project:read',
	'folder:create',
	'folder:read',
	'folder:update',
	'folder:delete',
	'folder:list',
	'folder:move',
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
	'credential:update',
	'credential:delete',
	'credential:list',
	'project:list',
	'project:read',
	'folder:create',
	'folder:read',
	'folder:update',
	'folder:delete',
	'folder:list',
];

export const PROJECT_VIEWER_SCOPES: Scope[] = [
	'credential:list',
	'credential:read',
	'project:list',
	'project:read',
	'workflow:list',
	'workflow:read',
	'folder:read',
	'folder:list',
];
