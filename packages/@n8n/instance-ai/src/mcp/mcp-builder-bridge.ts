/**
 * MCP Builder Bridge
 *
 * Creates a Mastra MCP client that connects to the local n8n MCP server,
 * returning its tools for use by the MCP-based workflow builder agent.
 */

import type { ToolsInput } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';

import { sanitizeMcpToolSchemas } from '../agent/sanitize-mcp-schemas';

export interface McpBuilderConfig {
	baseUrl: string;
	apiKey: string;
}

/**
 * Connect to the n8n MCP server and return its tools as Mastra-compatible tools.
 * The returned MCPClient must be disconnected after the builder session ends.
 */
export async function createMcpBuilderClient(
	config: McpBuilderConfig,
): Promise<{ tools: ToolsInput; client: MCPClient }> {
	const client = new MCPClient({
		servers: {
			'n8n-builder': {
				url: new URL(`${config.baseUrl}/mcp-server/http`),
				requestInit: {
					headers: {
						Authorization: `Bearer ${config.apiKey}`,
						'X-N8N-MCP-Internal': 'builder',
					},
				},
			},
		},
	});

	const tools = await client.listTools();
	return { tools: sanitizeMcpToolSchemas(tools), client };
}
