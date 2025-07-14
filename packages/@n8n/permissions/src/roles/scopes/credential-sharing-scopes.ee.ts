import type { Scope } from '../../types.ee';

export const CREDENTIALS_SHARING_OWNER_SCOPES: Scope[] = [
	'credential:read',
	'credential:update',
	'credential:delete',
	'credential:share',
	'credential:move',
];

export const CREDENTIALS_SHARING_USER_SCOPES: Scope[] = ['credential:read'];
