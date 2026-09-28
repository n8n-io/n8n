import type { IExecuteResponsePromiseData } from 'n8n-workflow';
import { CHAT_TRIGGER_NODE_TYPE, FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from 'n8n-workflow';

export const WEBHOOK_CONFLICT_MESSAGE = 'There is a conflict with one of the webhooks.';

export const authAllowlistedNodes = new Set([
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	FORM_NODE_TYPE,
]);

/**
 * Resolved into an execution's response promise when the execution ends without
 * the Respond to Webhook node having produced a response. Consumers compare by
 * identity and must not answer the HTTP request with it: an empty object here
 * means "no response was produced", not "the workflow responded with no body".
 */
export const EXECUTION_ENDED_WITHOUT_RESPONSE: IExecuteResponsePromiseData = Object.freeze({});
