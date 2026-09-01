import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { z } from 'zod';

import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';

import { BUILDER_TOOLS } from './builder-tool-names';

export interface SearchMcpServersDeps {
	mcpRegistryService: McpRegistryService;
}

const searchMcpServersInputSchema = z.object({
	queries: z
		.array(z.string())
		.min(1)
		.describe('Search queries for MCP servers (e.g., ["github"], ["slack"])'),
});

export function buildSearchMcpServersTool(deps: SearchMcpServersDeps): BuiltTool {
	return new Tool(BUILDER_TOOLS.SEARCH_MCP_SERVERS)
		.description(
			'Search the MCP registry for available MCP servers. Returns MCP config-ready server details, ' +
				'including credentialType for ask_credential and server metadata needed for patch_config.',
		)
		.input(searchMcpServersInputSchema)
		.handler(async ({ queries }: { queries: string[] }) => {
			return { results: await deps.mcpRegistryService.search(queries) };
		})
		.build();
}
