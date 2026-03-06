import { NodeSearchEngine } from '@n8n/ai-workflow-builder';
import type { User } from '@n8n/db';
import type { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

import type { Telemetry } from '@/telemetry';

const inputSchema = {
	queries: z
		.array(
			z.object({
				queryType: z
					.enum(['name', 'subNodeSearch'])
					.describe(
						"The type of search to perform. 'name' searches by node name/description. 'subNodeSearch' finds sub-nodes that output a specific connection type.",
					),
				query: z.string().describe('The search query string'),
				connectionType: z
					.string()
					.optional()
					.describe(
						"The connection type to search for (only used with 'subNodeSearch' queryType, e.g. 'ai_tool', 'ai_memory')",
					),
			}),
		)
		.describe('Array of search queries to execute'),
} satisfies z.ZodRawShape;

const nodeSearchResultSchema = z.object({
	name: z.string().describe('The internal name of the node type'),
	displayName: z.string().describe('The human-readable display name of the node'),
	description: z.string().describe('A description of what the node does'),
	version: z.number().describe('The latest version of the node'),
	score: z.number().describe('The relevance score of the search result'),
	inputs: z.unknown().describe('The input connection types of the node'),
	outputs: z.unknown().describe('The output connection types of the node'),
});

const outputSchema = {
	results: z
		.array(
			z.object({
				query: z.string().describe('The original search query'),
				queryType: z
					.enum(['name', 'subNodeSearch'])
					.describe('The type of search that was performed'),
				nodes: z.array(nodeSearchResultSchema).describe('The matching node types'),
			}),
		)
		.describe('Search results for each query'),
	totalResults: z
		.number()
		.int()
		.min(0)
		.describe('Total number of matching nodes across all queries'),
} satisfies z.ZodRawShape;

interface SearchQuery {
	queryType: 'name' | 'subNodeSearch';
	query: string;
	connectionType?: string;
}

interface SearchResultItem {
	query: string;
	queryType: 'name' | 'subNodeSearch';
	nodes: Array<{
		name: string;
		displayName: string;
		description: string;
		version: number;
		score: number;
		inputs: INodeTypeDescription['inputs'];
		outputs: INodeTypeDescription['outputs'];
	}>;
}

interface SearchNodesResult {
	[key: string]: unknown;
	results: SearchResultItem[];
	totalResults: number;
}

/**
 * Creates MCP tool definition for searching n8n node types by name or connection type.
 * Wraps the NodeSearchEngine from the AI workflow builder to provide fuzzy search
 * and connection-type-based sub-node discovery.
 */
export const createSearchNodesTool = (
	user: User,
	nodeTypes: INodeTypeDescription[],
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => {
	const engine = new NodeSearchEngine(nodeTypes);

	return {
		name: 'search_nodes',
		config: {
			description:
				'Search for n8n node types by name or find sub-nodes that output specific connection types. Use this to discover which nodes are available for building workflows.',
			inputSchema,
			outputSchema,
			annotations: {
				title: 'Search Nodes',
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		handler: async ({ queries }: { queries: SearchQuery[] }) => {
			const parameters = { queries };
			const telemetryPayload: UserCalledMCPToolEventPayload = {
				user_id: user.id,
				tool_name: 'search_nodes',
				parameters,
			};

			try {
				const results: SearchResultItem[] = queries.map((searchQuery) => {
					const { queryType, query, connectionType } = searchQuery;

					const nodes =
						queryType === 'name'
							? engine.searchByName(query, 5)
							: engine.searchByConnectionType(
									(connectionType ?? '') as NodeConnectionType,
									5,
									query,
								);

					return {
						query,
						queryType,
						nodes,
					};
				});

				const totalResults = results.reduce((sum, r) => sum + r.nodes.length, 0);
				const payload: SearchNodesResult = { results, totalResults };

				telemetryPayload.results = {
					success: true,
					data: {
						query_count: queries.length,
						total_results: totalResults,
					},
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				return {
					content: [{ type: 'text', text: JSON.stringify(payload) }],
					structuredContent: payload,
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
	};
};
