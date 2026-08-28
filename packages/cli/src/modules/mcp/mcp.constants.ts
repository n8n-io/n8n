import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

/**
 * TELEMETRY EVENTS - backend
 * Frontend events are defined in @n8n/mcp-apps package
 */
export const USER_CONNECTED_TO_MCP_EVENT = 'User connected to MCP server';
export const USER_CALLED_MCP_TOOL_EVENT = 'User called mcp tool';
export const MCP_PREVIEW_RENDER_REQUESTED_EVENT = 'MCP App preview render requested';
export const MCP_CREDENTIALS_AUTOASSIGN_EVENT = 'MCP credentials autoassign';

/**
 * Per-request `_meta` envelope keys (2026-07-28 revision, SEP-2575). The
 * `initialize` handshake is gone; clients now stamp their protocol version and
 * identity into `params._meta` on every request, keyed by these spec-defined
 * URIs. Mirrored locally rather than imported so reading them off a request
 * never eagerly loads the v2 SDK at boot — every value import of
 * `@modelcontextprotocol/server` is lazy (see mcp.controller.ts /
 * mcp.service.ts). A unit test pins these to the SDK's exported constants so
 * they can't silently drift.
 */
export const MCP_PROTOCOL_VERSION_META_KEY = 'io.modelcontextprotocol/protocolVersion';
export const MCP_CLIENT_INFO_META_KEY = 'io.modelcontextprotocol/clientInfo';

/**
 * The modern capability-discovery RPC (SEP-2575). Replaces `initialize` as the
 * point where a client probes the server's protocol version and capabilities,
 * so it's the connection-handshake analog for telemetry.
 */
export const MCP_DISCOVER_METHOD = 'server/discover';

/**
 * Message constants
 */
export const UNAUTHORIZED_ERROR_MESSAGE = 'Unauthorized';
export const INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error';
export const MCP_ACCESS_DISABLED_ERROR_MESSAGE = 'MCP access is disabled';
/** Telemetry-only: the handshake reached the SDK but it answered with an error. */
export const HANDSHAKE_FAILED_ERROR_MESSAGE = 'MCP handshake failed';
/** Telemetry-only: a `server/discover` with no protocol version to negotiate on. */
export const MISSING_PROTOCOL_VERSION_ERROR_MESSAGE =
	'MCP handshake failed: no protocol version declared';

/**
 * Tool name constants
 */
export const LIST_N8N_CONNECT_SERVICES_TOOL_NAME = 'list_n8n_connect_services';
export const MCP_CALL_AGENT_TOOL_NAME = 'call_agent';
export const MCP_CREATE_AGENT_TOOL_NAME = 'create_agent';

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
