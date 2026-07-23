import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { z } from 'zod';

import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';

import type { AgentsToolsService } from '../agents-tools.service';
import { BUILDER_TOOLS } from './builder-tool-names';

export interface ResolveIntegrationDeps {
	mcpRegistryService: McpRegistryService;
	agentsToolsService: AgentsToolsService;
}

const resolveIntegrationInputSchema = z.object({
	queries: z
		.array(z.string())
		.min(1)
		.describe('External services to resolve (e.g. ["github"], ["slack"])'),
});

export function buildResolveIntegrationTool(deps: ResolveIntegrationDeps): BuiltTool {
	return new Tool(BUILDER_TOOLS.RESOLVE_INTEGRATION)
		.description(
			'Resolve external services to MCP servers or n8n node tools. Searches the MCP registry first and returns kind: "mcp" when a match exists; only searches agent-eligible n8n node tools and returns kind: "node" when no MCP server matches. For kind: "mcp", load agent-builder-mcp. For kind: "node", load agent-builder-node-tools and use the returned node results.',
		)
		.input(resolveIntegrationInputSchema)
		.handler(async ({ queries }: { queries: string[] }) => {
			const mcpResults = await deps.mcpRegistryService.search(queries);
			if (mcpResults.length > 0) {
				return { kind: 'mcp' as const, results: mcpResults };
			}

			const nodeResults = await deps.agentsToolsService.searchAgentToolNodes(queries);
			return {
				kind: 'node' as const,
				results: nodeResults.results,
				queriesWithNoResults: nodeResults.queriesWithNoResults,
			};
		})
		.build();
}
