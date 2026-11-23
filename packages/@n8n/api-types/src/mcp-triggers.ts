import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

/**
 * Triggers supported in production mode for MCP execution
 */
export const SUPPORTED_PRODUCTION_MCP_TRIGGERS = {
	[SCHEDULE_TRIGGER_NODE_TYPE]: 'Schedule Trigger',
	[WEBHOOK_NODE_TYPE]: 'Webhook Trigger',
	[FORM_TRIGGER_NODE_TYPE]: 'Form Trigger',
	[CHAT_TRIGGER_NODE_TYPE]: 'Chat Trigger',
};
