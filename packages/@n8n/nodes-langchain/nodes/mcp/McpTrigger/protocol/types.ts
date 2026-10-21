import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

import type { McpContentBlock } from '../../shared/utils';

export interface McpToolCallInfo {
	toolName: string;
	arguments: Record<string, unknown>;
	sourceNodeName?: string;
}

export interface McpToolResult {
	[key: string]: unknown;
	content: McpContentBlock[];
	isError?: boolean;
}

export type { JSONRPCMessage };

export const MCP_LIST_TOOLS_REQUEST_MARKER = { _listToolsRequest: true } as const;
