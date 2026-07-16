import type { User } from '@n8n/db';
import z from 'zod';

import type { NodeCatalogService } from '@/node-catalog';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { Telemetry } from '@/telemetry';

import { CODE_BUILDER_SEARCH_NODES_TOOL } from './constants';
import { toN8nConnectCoverage } from '../../mcp-ai-gateway.helper';
import {
	LIST_N8N_CONNECT_SERVICES_TOOL_NAME,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../../mcp.constants';
import type {
	N8nConnectCoverage,
	ToolDefinition,
	UserCalledMCPToolEventPayload,
} from '../../mcp.types';

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

const outputSchema = {
	results: z
		.string()
		.describe('Search results with matching node IDs, discriminators, and related nodes'),
	n8nConnect: z
		.object({
			credentialTypes: z.array(z.string()).describe('Credential types n8n Connect can provide.'),
			nodes: z
				.array(z.string())
				.describe(
					'Node types n8n Connect may cover. Prefer these when the user has not specified an integration. Candidate coverage only — exact eligibility also depends on the node action, minimum type version, and hidden properties.',
				),
		})
		.optional()
		.describe(
			`Present when n8n Connect is available. Candidate coverage — cross-reference against the search results, but call ${LIST_N8N_CONNECT_SERVICES_TOOL_NAME} for exact eligibility (supported actions, min versions, hidden properties).`,
		),
} satisfies z.ZodRawShape;

type SearchNodesInput = {
	queries: string[];
	usage?: 'workflow' | 'agentTool';
};

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
		outputSchema,
		annotations: {
			title: CODE_BUILDER_SEARCH_NODES_TOOL.displayTitle,
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ queries, usage }, _extra) => {
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
					: undefined;
			const [{ results, queriesWithNoResults }, availability] = await Promise.all([
				options
					? nodeCatalogService.searchNodes(queries, options)
					: nodeCatalogService.searchNodes(queries),
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

			const structured: {
				results: string;
				n8nConnect?: N8nConnectCoverage;
			} = {
				results,
			};
			const coverage = toN8nConnectCoverage(availability);
			if (coverage) structured.n8nConnect = coverage;

			const text = coverage ? `${results}\n\nn8nConnect: ${JSON.stringify(coverage)}` : results;

			return {
				content: [{ type: 'text', text }],
				structuredContent: structured,
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
