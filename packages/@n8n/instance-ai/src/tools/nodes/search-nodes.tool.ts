import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { NodeSearchEngine } from './node-search-engine';
import type { InstanceAiContext } from '../../types';

export const searchNodesInputSchema = z.object({
	query: z
		.string()
		.optional()
		.describe('Search query to match against node names, display names, aliases, and descriptions'),
	connectionType: z
		.string()
		.optional()
		.describe(
			'Filter results by AI connection type. Use this when you need sub-nodes for an AI Agent: ' +
				'"ai_tool" for tool nodes the agent can call (e.g., Google Calendar Tool, Slack Tool), ' +
				'"ai_languageModel" for LLM providers, "ai_memory" for memory backends, ' +
				'"ai_embedding" for embedding models, "ai_vectorStore" for vector stores. ' +
				'IMPORTANT: Many regular nodes (Google Calendar, Slack, Gmail, etc.) have auto-generated ' +
				'tool variants (e.g., "Google Calendar Tool") that only appear when filtering by "ai_tool". ' +
				'A plain name search may not surface these tool nodes because other results push them out. ' +
				'Always use connectionType="ai_tool" combined with a query when looking for tools to attach to an AI Agent.',
		),
	limit: z
		.number()
		.optional()
		.default(10)
		.describe('Maximum number of results to return (default: 10)'),
});

export function createSearchNodesTool(context: InstanceAiContext) {
	return createTool({
		id: 'search-nodes',
		description:
			'Search available n8n node types by name or by AI connection type. ' +
			'Returns scored results with builder hints, subnode requirements, ' +
			'input/output connection types, and available resource/operation discriminators. ' +
			'Use this to discover which nodes to use when building workflows. ' +
			'When a node has discriminators, use them with get-node-type-definition to get the exact schema. ' +
			'IMPORTANT: Use short, specific queries — search by service name (e.g., "Gmail", "Airtable", "Slack") ' +
			'not by action descriptions. Never prefix queries with "n8n". ' +
			'When building AI Agent workflows, use connectionType="ai_tool" with a query to find tool nodes ' +
			'(e.g., "Google Calendar Tool", "Slack Tool") — these are auto-generated tool variants of regular nodes ' +
			'that a plain name search may miss.',
		inputSchema: searchNodesInputSchema,
		outputSchema: z.object({
			results: z.array(
				z.object({
					name: z.string(),
					displayName: z.string(),
					description: z.string(),
					version: z.number(),
					score: z.number(),
					inputs: z.union([z.array(z.string()), z.string()]),
					outputs: z.union([z.array(z.string()), z.string()]),
					builderHintMessage: z.string().optional(),
					subnodeRequirements: z
						.array(
							z.object({
								connectionType: z.string(),
								required: z.boolean(),
							}),
						)
						.optional(),
					discriminators: z
						.object({
							resources: z.array(
								z.object({
									name: z.string(),
									operations: z.array(z.string()),
								}),
							),
						})
						.optional(),
				}),
			),
			totalResults: z.number(),
		}),
		execute: async (input: z.infer<typeof searchNodesInputSchema>) => {
			const nodeTypes = await context.nodeService.listSearchable();
			const engine = new NodeSearchEngine(nodeTypes);

			let results;
			if (input.connectionType) {
				results = engine.searchByConnectionType(input.connectionType, input.limit, input.query);
			} else if (input.query) {
				results = engine.searchByName(input.query, input.limit);
			} else {
				return { results: [], totalResults: 0 };
			}

			// Enrich results with discriminator info (resources/operations) when available
			const enriched = await Promise.all(
				results.map(async (r) => {
					if (!context.nodeService.listDiscriminators) return r;
					const disc = await context.nodeService.listDiscriminators(r.name);
					if (!disc) return r;
					return { ...r, discriminators: disc };
				}),
			);

			return {
				results: enriched,
				totalResults: enriched.length,
			};
		},
	});
}
