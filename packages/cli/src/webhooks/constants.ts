import { CHAT_TRIGGER_NODE_TYPE, FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from 'n8n-workflow';

export const authAllowlistedNodes = new Set([
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	FORM_NODE_TYPE,
]);
