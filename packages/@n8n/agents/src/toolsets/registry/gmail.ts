import type { AppDefinition } from '../types';

const GMAIL_MANIFEST = `Gmail — read, send, organize email and threads on the connected user's account.

Capabilities:
- Messages: send, reply, list, get, delete, mark read/unread, add/remove labels.
- Threads: list, get, reply, label, trash/untrash, delete.
- Labels: create, get, list, delete.
- Drafts: create, get, list, delete.

Use list_operations to enumerate exact operation names, then describe_operation to get the parameter schema for one operation, then invoke_operation to execute it.`;

const READ = 'https://www.googleapis.com/auth/gmail.readonly';
const COMPOSE = 'https://www.googleapis.com/auth/gmail.compose';
const MODIFY = 'https://www.googleapis.com/auth/gmail.modify';
const LABELS = 'https://www.googleapis.com/auth/gmail.labels';
const FULL = 'https://mail.google.com/';

export const GMAIL_APP: AppDefinition = {
	kind: 'gmail',
	label: 'Gmail',
	icon: 'mail',

	nodeType: 'n8n-nodes-base.gmail',
	nodeTypeVersion: 2.2,
	credentialType: 'gmailOAuth2',

	manifest: GMAIL_MANIFEST,

	operations: {
		'message:send': { requiredScopes: [COMPOSE], destructive: true },
		'message:reply': { requiredScopes: [COMPOSE], destructive: true },
		'message:get': { requiredScopes: [READ] },
		'message:getAll': { requiredScopes: [READ] },
		'message:delete': { requiredScopes: [FULL], destructive: true },
		'message:markAsRead': { requiredScopes: [MODIFY], destructive: true },
		'message:markAsUnread': { requiredScopes: [MODIFY], destructive: true },
		'message:addLabels': { requiredScopes: [MODIFY], destructive: true },
		'message:removeLabels': { requiredScopes: [MODIFY], destructive: true },
		'message:sendAndWait': { requiredScopes: [COMPOSE], destructive: true },

		'thread:get': { requiredScopes: [READ] },
		'thread:getAll': { requiredScopes: [READ] },
		'thread:reply': { requiredScopes: [COMPOSE], destructive: true },
		'thread:delete': { requiredScopes: [FULL], destructive: true },
		'thread:trash': { requiredScopes: [MODIFY], destructive: true },
		'thread:untrash': { requiredScopes: [MODIFY], destructive: true },
		'thread:addLabels': { requiredScopes: [MODIFY], destructive: true },
		'thread:removeLabels': { requiredScopes: [MODIFY], destructive: true },

		'label:create': { requiredScopes: [LABELS], destructive: true },
		'label:get': { requiredScopes: [LABELS] },
		'label:getAll': { requiredScopes: [LABELS] },
		'label:delete': { requiredScopes: [LABELS], destructive: true },

		'draft:create': { requiredScopes: [COMPOSE], destructive: true },
		'draft:get': { requiredScopes: [READ] },
		'draft:getAll': { requiredScopes: [READ] },
		'draft:delete': { requiredScopes: [COMPOSE], destructive: true },
	},

	scopes: {
		fullAccessScope: FULL,
	},
};
