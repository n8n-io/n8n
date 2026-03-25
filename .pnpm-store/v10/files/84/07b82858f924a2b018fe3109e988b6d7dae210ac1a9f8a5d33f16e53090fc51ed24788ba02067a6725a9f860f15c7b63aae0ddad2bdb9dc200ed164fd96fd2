Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

/**
 * Essential MCP attribute constants for Sentry instrumentation
 *
 * Based on OpenTelemetry MCP semantic conventions
 * @see https://github.com/open-telemetry/semantic-conventions/blob/3097fb0af5b9492b0e3f55dc5f6c21a3dc2be8df/docs/gen-ai/mcp.md
 */

// =============================================================================
// CORE MCP ATTRIBUTES
// =============================================================================

/** The name of the request or notification method */
const MCP_METHOD_NAME_ATTRIBUTE = 'mcp.method.name';

/** JSON-RPC request identifier for the request. Unique within the MCP session. */
const MCP_REQUEST_ID_ATTRIBUTE = 'mcp.request.id';

/** Identifies the MCP session */
const MCP_SESSION_ID_ATTRIBUTE = 'mcp.session.id';

/** Transport method used for MCP communication */
const MCP_TRANSPORT_ATTRIBUTE = 'mcp.transport';

// =============================================================================
// SERVER ATTRIBUTES
// =============================================================================

/** Name of the MCP server application */
const MCP_SERVER_NAME_ATTRIBUTE = 'mcp.server.name';

/** Display title of the MCP server application */
const MCP_SERVER_TITLE_ATTRIBUTE = 'mcp.server.title';

/** Version of the MCP server application */
const MCP_SERVER_VERSION_ATTRIBUTE = 'mcp.server.version';

/** MCP protocol version used in the session */
const MCP_PROTOCOL_VERSION_ATTRIBUTE = 'mcp.protocol.version';

// =============================================================================
// METHOD-SPECIFIC ATTRIBUTES
// =============================================================================

/** Name of the tool being called */
const MCP_TOOL_NAME_ATTRIBUTE = 'mcp.tool.name';

/** The resource URI being accessed */
const MCP_RESOURCE_URI_ATTRIBUTE = 'mcp.resource.uri';

/** Name of the prompt template */
const MCP_PROMPT_NAME_ATTRIBUTE = 'mcp.prompt.name';

// =============================================================================
// TOOL RESULT ATTRIBUTES
// =============================================================================

/** Whether a tool execution resulted in an error */
const MCP_TOOL_RESULT_IS_ERROR_ATTRIBUTE = 'mcp.tool.result.is_error';

/** Number of content items in the tool result */
const MCP_TOOL_RESULT_CONTENT_COUNT_ATTRIBUTE = 'mcp.tool.result.content_count';

// =============================================================================
// PROMPT RESULT ATTRIBUTES
// =============================================================================

/** Description of the prompt result */
const MCP_PROMPT_RESULT_DESCRIPTION_ATTRIBUTE = 'mcp.prompt.result.description';

/** Number of messages in the prompt result */
const MCP_PROMPT_RESULT_MESSAGE_COUNT_ATTRIBUTE = 'mcp.prompt.result.message_count';

// =============================================================================
// REQUEST ARGUMENT ATTRIBUTES
// =============================================================================

/** Prefix for MCP request argument prefix for each argument */
const MCP_REQUEST_ARGUMENT = 'mcp.request.argument';

// =============================================================================
// LOGGING ATTRIBUTES
// =============================================================================

/** Log level for MCP logging operations */
const MCP_LOGGING_LEVEL_ATTRIBUTE = 'mcp.logging.level';

/** Logger name for MCP logging operations */
const MCP_LOGGING_LOGGER_ATTRIBUTE = 'mcp.logging.logger';

/** Data type of the logged message */
const MCP_LOGGING_DATA_TYPE_ATTRIBUTE = 'mcp.logging.data_type';

/** Log message content */
const MCP_LOGGING_MESSAGE_ATTRIBUTE = 'mcp.logging.message';

// =============================================================================
// NETWORK ATTRIBUTES (OpenTelemetry Standard)
// =============================================================================

/** OSI transport layer protocol */
const NETWORK_TRANSPORT_ATTRIBUTE = 'network.transport';

/** The version of JSON RPC protocol used */
const NETWORK_PROTOCOL_VERSION_ATTRIBUTE = 'network.protocol.version';

/** Client address - domain name if available without reverse DNS lookup; otherwise, IP address or Unix domain socket name */
const CLIENT_ADDRESS_ATTRIBUTE = 'client.address';

/** Client port number */
const CLIENT_PORT_ATTRIBUTE = 'client.port';

// =============================================================================
// SENTRY-SPECIFIC MCP ATTRIBUTE VALUES
// =============================================================================

/** Sentry operation value for MCP server spans */
const MCP_SERVER_OP_VALUE = 'mcp.server';

/**
 * Sentry operation value for client-to-server notifications
 * Following OpenTelemetry MCP semantic conventions
 */
const MCP_NOTIFICATION_CLIENT_TO_SERVER_OP_VALUE = 'mcp.notification.client_to_server';

/**
 * Sentry operation value for server-to-client notifications
 * Following OpenTelemetry MCP semantic conventions
 */
const MCP_NOTIFICATION_SERVER_TO_CLIENT_OP_VALUE = 'mcp.notification.server_to_client';

/** Sentry origin value for MCP function spans */
const MCP_FUNCTION_ORIGIN_VALUE = 'auto.function.mcp_server';

/** Sentry origin value for MCP notification spans */
const MCP_NOTIFICATION_ORIGIN_VALUE = 'auto.mcp.notification';

/** Sentry source value for MCP route spans */
const MCP_ROUTE_SOURCE_VALUE = 'route';

exports.CLIENT_ADDRESS_ATTRIBUTE = CLIENT_ADDRESS_ATTRIBUTE;
exports.CLIENT_PORT_ATTRIBUTE = CLIENT_PORT_ATTRIBUTE;
exports.MCP_FUNCTION_ORIGIN_VALUE = MCP_FUNCTION_ORIGIN_VALUE;
exports.MCP_LOGGING_DATA_TYPE_ATTRIBUTE = MCP_LOGGING_DATA_TYPE_ATTRIBUTE;
exports.MCP_LOGGING_LEVEL_ATTRIBUTE = MCP_LOGGING_LEVEL_ATTRIBUTE;
exports.MCP_LOGGING_LOGGER_ATTRIBUTE = MCP_LOGGING_LOGGER_ATTRIBUTE;
exports.MCP_LOGGING_MESSAGE_ATTRIBUTE = MCP_LOGGING_MESSAGE_ATTRIBUTE;
exports.MCP_METHOD_NAME_ATTRIBUTE = MCP_METHOD_NAME_ATTRIBUTE;
exports.MCP_NOTIFICATION_CLIENT_TO_SERVER_OP_VALUE = MCP_NOTIFICATION_CLIENT_TO_SERVER_OP_VALUE;
exports.MCP_NOTIFICATION_ORIGIN_VALUE = MCP_NOTIFICATION_ORIGIN_VALUE;
exports.MCP_NOTIFICATION_SERVER_TO_CLIENT_OP_VALUE = MCP_NOTIFICATION_SERVER_TO_CLIENT_OP_VALUE;
exports.MCP_PROMPT_NAME_ATTRIBUTE = MCP_PROMPT_NAME_ATTRIBUTE;
exports.MCP_PROMPT_RESULT_DESCRIPTION_ATTRIBUTE = MCP_PROMPT_RESULT_DESCRIPTION_ATTRIBUTE;
exports.MCP_PROMPT_RESULT_MESSAGE_COUNT_ATTRIBUTE = MCP_PROMPT_RESULT_MESSAGE_COUNT_ATTRIBUTE;
exports.MCP_PROTOCOL_VERSION_ATTRIBUTE = MCP_PROTOCOL_VERSION_ATTRIBUTE;
exports.MCP_REQUEST_ARGUMENT = MCP_REQUEST_ARGUMENT;
exports.MCP_REQUEST_ID_ATTRIBUTE = MCP_REQUEST_ID_ATTRIBUTE;
exports.MCP_RESOURCE_URI_ATTRIBUTE = MCP_RESOURCE_URI_ATTRIBUTE;
exports.MCP_ROUTE_SOURCE_VALUE = MCP_ROUTE_SOURCE_VALUE;
exports.MCP_SERVER_NAME_ATTRIBUTE = MCP_SERVER_NAME_ATTRIBUTE;
exports.MCP_SERVER_OP_VALUE = MCP_SERVER_OP_VALUE;
exports.MCP_SERVER_TITLE_ATTRIBUTE = MCP_SERVER_TITLE_ATTRIBUTE;
exports.MCP_SERVER_VERSION_ATTRIBUTE = MCP_SERVER_VERSION_ATTRIBUTE;
exports.MCP_SESSION_ID_ATTRIBUTE = MCP_SESSION_ID_ATTRIBUTE;
exports.MCP_TOOL_NAME_ATTRIBUTE = MCP_TOOL_NAME_ATTRIBUTE;
exports.MCP_TOOL_RESULT_CONTENT_COUNT_ATTRIBUTE = MCP_TOOL_RESULT_CONTENT_COUNT_ATTRIBUTE;
exports.MCP_TOOL_RESULT_IS_ERROR_ATTRIBUTE = MCP_TOOL_RESULT_IS_ERROR_ATTRIBUTE;
exports.MCP_TRANSPORT_ATTRIBUTE = MCP_TRANSPORT_ATTRIBUTE;
exports.NETWORK_PROTOCOL_VERSION_ATTRIBUTE = NETWORK_PROTOCOL_VERSION_ATTRIBUTE;
exports.NETWORK_TRANSPORT_ATTRIBUTE = NETWORK_TRANSPORT_ATTRIBUTE;
//# sourceMappingURL=attributes.js.map
