import type { Scope } from '../../types.ee';

export const CREDENTIALS_SHARING_OWNER_SCOPES: Scope[] = [
	'credential:read',
	'credential:update',
	'credential:delete',
	'credential:share',
	'credential:unshare',
	'credential:move',
	'credential:connect',
	// Owner-level capability: without it the sharing mask would strip
	// `credential:createEndUser` from a project admin's effective credential scopes.
	'credential:createEndUser',
];

export const CREDENTIALS_SHARING_USER_SCOPES: Scope[] = ['credential:read', 'credential:connect'];
