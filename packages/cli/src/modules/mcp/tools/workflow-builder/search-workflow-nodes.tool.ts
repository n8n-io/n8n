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
} satisfies z.ZodRawShape;

const outputSchema = {
	schemaVersion: z.literal('1.0').describe('Version of the structured node-search result schema.'),
	queries: z.array(z.string()).describe('Search queries in their original input order.'),
	count: z.number().int().nonnegative().describe('Number of structured node result items.'),
	items: z
		.array(
			z.object({
				queryIndex: z.number().int().nonnegative(),
				query: z.string(),
				nodeType: z.string(),
				displayName: z.string().optional(),
				description: z.string().optional(),
				package: z.string().optional(),
				versions: z.array(z.number()).optional(),
				groups: z.array(z.string()).optional(),
				isTrigger: z.boolean().optional(),
				relation: z.enum(['primary', 'related']),
			}),
		)
		.describe('Structured node matches in source order.'),
	queriesWithNoResults: z
		.array(z.string())
		.describe('Queries with no matching nodes, preserving input order and duplicates.'),
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
			const [{ results, items, queriesWithNoResults }, availability] = await Promise.all([
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

			const coverage = toN8nConnectCoverage(availability);
			const structured: {
				schemaVersion: '1.0';
				queries: string[];
				count: number;
				items: typeof items;
				queriesWithNoResults: string[];
				results: string;
				n8nConnect?: N8nConnectCoverage;
			} = {
				schemaVersion: '1.0',
				queries,
				count: items.length,
				items,
				queriesWithNoResults,
				results,
			};
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
