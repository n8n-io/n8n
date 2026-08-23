import { CHAT_TRIGGER_NODE_TYPE, FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from 'n8n-workflow';

export const WEBHOOK_CONFLICT_MESSAGE = 'There is a conflict with one of the webhooks.';

export const authAllowlistedNodes = new Set([
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	FORM_NODE_TYPE,
]);
