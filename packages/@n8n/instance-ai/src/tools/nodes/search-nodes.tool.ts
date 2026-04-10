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
			'AI connection type to search for sub-nodes (e.g., "ai_languageModel", "ai_memory", "ai_tool", "ai_embedding", "ai_vectorStore")',
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
			'not by action descriptions. Never prefix queries with "n8n".',
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
