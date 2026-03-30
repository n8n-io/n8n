import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

export const USER_CONNECTED_TO_MCP_EVENT = 'User connected to MCP server';
export const USER_CALLED_MCP_TOOL_EVENT = 'User called mcp tool';

export const UNAUTHORIZED_ERROR_MESSAGE = 'Unauthorized';
export const INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error';

/**
 * Error message returned when MCP access is disabled.
 * This ensures clients get a clear 403 Forbidden response instead of
 * connection errors or 404s that mask the real issue.
 * 
 * To enable MCP access:
 * - UI: Settings > MCP Access > Toggle "Enable MCP Access"
 * - API: PATCH /rest/mcp/settings with {"mcpAccessEnabled": true}
 * 
 * Note: There is NO N8N_MCP_ENABLED environment variable.
 */
export const MCP_ACCESS_DISABLED_ERROR_MESSAGE =
	'MCP access is disabled. Enable it in Settings > MCP Access or via API: PATCH /rest/mcp/settings';

/**
 * MCP endpoint information returned by GET /mcp-server/http
 * Used for endpoint discovery by MCP clients
 */
export const MCP_ENDPOINT_INFO = {
	name: 'n8n MCP Server',
	version: '1.0.0',
	protocol: 'mcp',
	transport: 'http',
	authentication: 'Bearer',
	endpoint: '/mcp-server/http',
	methods: ['POST'],
	description: 'n8n Model Context Protocol server endpoint',
} as const;

/**
 * Triggers supported in production mode for MCP execution
 */
export const SUPPORTED_PRODUCTION_MCP_TRIGGERS = {
	[SCHEDULE_TRIGGER_NODE_TYPE]: 'Schedule Trigger',
	[WEBHOOK_NODE_TYPE]: 'Webhook Trigger',
	[FORM_TRIGGER_NODE_TYPE]: 'Form Trigger',
	[CHAT_TRIGGER_NODE_TYPE]: 'Chat Trigger',
};

/**
 * All triggers supported for MCP (production + manual mode)
 */
export const SUPPORTED_MCP_TRIGGERS = {
	...SUPPORTED_PRODUCTION_MCP_TRIGGERS,
	[MANUAL_TRIGGER_NODE_TYPE]: 'Manual Trigger',
};
