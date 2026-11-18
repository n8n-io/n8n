/** Matches the backend module name, so the module-active checks agree. */
export const MCP_SERVERS_MODULE_ID = 'mcp-servers';

export const MCP_SERVERS_LIST_VIEW = 'McpServersList';
export const MCP_SERVER_VIEW = 'McpServerView';
export const MCP_SERVER_SHARE_VIEW = 'McpServerShareView';

export const MCP_SERVER_TABS = [
	'build',
	'access',
	'connect',
	'playground',
	'logs',
	'analytics',
] as const;
export type McpServerTab = (typeof MCP_SERVER_TABS)[number];

/** Query flag set right after "Create MCP server": opens the Assistant and the start state. */
export const MCP_SERVER_NEW_QUERY = 'new';

export const MCP_SERVER_ASSISTANT_MIN_WIDTH = 320;
export const MCP_SERVER_ASSISTANT_MAX_WIDTH = 720;
export const MCP_SERVER_ASSISTANT_DEFAULT_WIDTH = 420;

/** How long the "Updated by the Assistant" pill stays. */
export const MCP_SERVER_ASSISTANT_UPDATE_NOTICE_MS = 6000;

export function isMcpServerTab(value: unknown): value is McpServerTab {
	return typeof value === 'string' && (MCP_SERVER_TABS as readonly string[]).includes(value);
}
