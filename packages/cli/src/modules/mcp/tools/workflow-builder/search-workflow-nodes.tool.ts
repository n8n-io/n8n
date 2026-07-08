import type { User } from '@n8n/db';
import z from 'zod';

import type { NodeCatalogService } from '@/node-catalog';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { Telemetry } from '@/telemetry';

import { CODE_BUILDER_SEARCH_NODES_TOOL } from './constants';
import { toAiGatewayCoverage } from '../../mcp-ai-gateway.helper';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type {
	AiGatewayCoverage,
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
} satisfies z.ZodRawShape;

const outputSchema = {
	results: z
		.string()
		.describe('Search results with matching node IDs, discriminators, and related nodes'),
	aiGateway: z
		.object({
			credentialTypes: z.array(z.string()).describe('Credential types n8n Connect can provide.'),
			nodes: z
				.array(z.string())
				.describe(
					'Node types n8n Connect covers. Prefer these when the user has not specified an integration — they let the workflow run without credential setup.',
				),
		})
		.optional()
		.describe(
			'Present when n8n Connect ("AI Gateway") is available. Cross-reference against the search results to know which returned nodes will get free credentials.',
		),
} satisfies z.ZodRawShape;

/**
 * MCP tool that searches for n8n nodes by keyword.
 * Wraps the code-builder's search tool.
 */
export const createSearchWorkflowNodesTool = (
	user: User,
	nodeCatalogService: NodeCatalogService,
	telemetry: Telemetry,
	aiGatewayService: AiGatewayService,
): ToolDefinition<typeof inputSchema> => ({
	name: CODE_BUILDER_SEARCH_NODES_TOOL.toolName,
	config: {
		description:
			'Search for n8n nodes by service name, trigger type, or utility function. Returns node IDs, discriminators (resource/operation/mode), and related nodes needed for get_node_types.',
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
	handler: async ({ queries }: { queries: string[] }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: CODE_BUILDER_SEARCH_NODES_TOOL.toolName,
			parameters: { queries },
		};

		try {
			const [{ results, queriesWithNoResults }, availability] = await Promise.all([
				nodeCatalogService.searchNodes(queries),
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
				aiGateway?: AiGatewayCoverage;
			} = {
				results,
			};
			const coverage = toAiGatewayCoverage(availability);
			if (coverage) structured.aiGateway = coverage;

			return {
				content: [{ type: 'text', text: results }],
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
