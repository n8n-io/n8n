import type { JSONRPCMessage } from "@modelcontextprotocol/server";

export interface McpToolCallInfo {
	toolName: string;
	arguments: Record<string, unknown>;
	sourceNodeName?: string;
}

export interface McpToolResult {
	[key: string]: unknown;
	content: Array<{ type: 'text'; text: string }>;
	isError?: boolean;
}

export type { JSONRPCMessage };

export const MCP_LIST_TOOLS_REQUEST_MARKER = { _listToolsRequest: true } as const;
