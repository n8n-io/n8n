import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

export const USER_CONNECTED_TO_MCP_EVENT = 'User connected to MCP server';
export const USER_CALLED_MCP_TOOL_EVENT = 'User called mcp tool';

export const UNAUTHORIZED_ERROR_MESSAGE = 'Unauthorized';
export const INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error';
export const MCP_ACCESS_DISABLED_ERROR_MESSAGE = 'MCP access is disabled';

export const SUPPORTED_MCP_TRIGGERS = {
	[SCHEDULE_TRIGGER_NODE_TYPE]: 'Schedule Trigger',
	[WEBHOOK_NODE_TYPE]: 'Webhook Trigger',
	[FORM_TRIGGER_NODE_TYPE]: 'Form Trigger',
	[CHAT_TRIGGER_NODE_TYPE]: 'Chat Trigger',
};
