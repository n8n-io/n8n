import type { User } from '@n8n/db';
import z from 'zod';

import type { NodeCatalogService } from '@/node-catalog';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { Telemetry } from '@/telemetry';

import { CODE_BUILDER_SEARCH_NODES_TOOL } from './constants';
import { toN8nConnectCoverage } from '../../mcp-ai-gateway.helper';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

const inputSchema = {
	queries: z
		.array(z.string())
		.min(1)
		.describe(
			'Search queries for n8n nodes — service names (e.g. "gmail", "slack"), trigger types (e.g. "schedule trigger", "webhook"), or utility nodes (e.g. "set", "if", "merge", "code")',
		),
	usage: z
		.enum(['workflow', 'agentTool'])
		.optional()
		.describe(
			'Use agentTool to return only nodes that can be configured as Agent tools; defaults to workflow',
		),
} satisfies z.ZodRawShape;

type SearchNodesInput = {
	queries: string[];
	usage?: 'workflow' | 'agentTool';
};

// The SDK's inferred handler input marks optional zod fields as required
// properties, so callers would have to pass `usage: undefined` explicitly.
type SearchNodesCallback = ToolDefinition<typeof inputSchema>['handler'];
type SearchNodesToolDefinition = Omit<ToolDefinition<typeof inputSchema>, 'handler'> & {
	handler: (
		input: SearchNodesInput,
		extra: Parameters<SearchNodesCallback>[1],
	) => ReturnType<SearchNodesCallback>;
};

/**
 * MCP tool that searches for n8n nodes by keyword.
 * Wraps the code-builder's search tool.
 */
export const createSearchWorkflowNodesTool = (
	user: User,
	nodeCatalogService: NodeCatalogService,
	telemetry: Telemetry,
	aiGatewayService: AiGatewayService,
): SearchNodesToolDefinition => ({
	name: CODE_BUILDER_SEARCH_NODES_TOOL.toolName,
	config: {
		description:
			'Search for n8n nodes by service name, trigger type, or utility function. Set usage="agentTool" to return only Agent-compatible tool nodes. Returns node IDs, discriminators (resource/operation/mode), and related nodes needed for get_node_types.',
		inputSchema,
		annotations: {
			title: CODE_BUILDER_SEARCH_NODES_TOOL.displayTitle,
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ queries, usage }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: CODE_BUILDER_SEARCH_NODES_TOOL.toolName,
			parameters: { queries, usage },
		};

		try {
			const options =
				usage === 'agentTool'
					? {
							nodeFilter: (await import('@/modules/agents/agents-tools.service.js'))
								.isAgentToolNodeType,
						}
					: {};
			const [{ results, queriesWithNoResults }, availability] = await Promise.all([
				nodeCatalogService.searchNodes(queries, options),
				aiGatewayService.isAvailable(),
			]);

			telemetryPayload.results = {
				success: true,
				data: {
					queryCount: queries.length,
					noResultQueryCount: queriesWithNoResults.length,
					queriesWithNoResults,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const coverage = toN8nConnectCoverage(availability);
			const text = coverage ? `${results}\n\nn8nConnect: ${JSON.stringify(coverage)}` : results;

			return {
				content: [{ type: 'text', text }],
			};
		} catch (error) {
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});
