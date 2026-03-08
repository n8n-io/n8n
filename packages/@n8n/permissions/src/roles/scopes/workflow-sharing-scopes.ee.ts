import type { Scope } from '../../types.ee';

export const WORKFLOW_SHARING_OWNER_SCOPES: Scope[] = [
	'workflow:read',
	'workflow:update',
	'workflow:publish',
	'workflow:unpublish',
	'workflow:delete',
	'workflow:execute',
	'workflow:share',
	'workflow:move',
	'workflow:execute-chat',
];

export const WORKFLOW_SHARING_EDITOR_SCOPES: Scope[] = [
	'workflow:read',
	'workflow:update',
	'workflow:publish',
	'workflow:unpublish',
	'workflow:execute',
	'workflow:execute-chat',
];
