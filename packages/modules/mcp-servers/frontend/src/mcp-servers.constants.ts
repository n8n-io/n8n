export const MCP_SERVERS_LIST_VIEW = 'McpServersListView';
export const PROJECT_MCP_SERVERS = 'ProjectMcpServers';
export const MCP_SERVER_VIEW = 'McpServerView';
export const MCP_SERVER_CONNECTIONS_VIEW = 'McpServerConnectionsView';
export const MCP_SERVER_SHARE_VIEW = 'McpServerShareView';

/** The share page of a server is `<editor>/mcp-share/<slug>`. Anyone with the link can open it. */
export const MCP_SERVER_SHARE_PATH = '/mcp-share';

/**
 * The settings page of the instance MCP. A module cannot import another module, so this
 * repeats the route name of `@n8n/frontend-module-mcp`.
 */
export const MCP_SETTINGS_ROUTE = 'McpSettings';
