import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

export interface McpCaller {
	listTools(): Promise<Tool[]>;
	callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
}
