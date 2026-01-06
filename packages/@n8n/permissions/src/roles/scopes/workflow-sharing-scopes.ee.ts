import type { Scope } from '../../types.ee';

export const WORKFLOW_SHARING_OWNER_SCOPES: Scope[] = [
	'workflow:read',
	'workflow:update',
	'workflow:publish',
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
	'workflow:execute',
	'workflow:execute-chat',
];
