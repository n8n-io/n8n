import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { categoryList, suggestedNodesData } from './suggested-nodes-data';

export function createGetSuggestedNodesTool() {
	return createTool({
		id: 'get-suggested-nodes',
		description:
			'Get curated node recommendations for a workflow technique category. ' +
			'Returns suggested nodes with configuration notes and pattern hints. ' +
			`Available categories: ${categoryList.join(', ')}. ` +
			'Call this early in the build process to get relevant nodes and avoid trial-and-error.',
		inputSchema: z.object({
			categories: z
				.array(z.string())
				.min(1)
				.max(3)
				.describe(`Workflow technique categories: ${categoryList.join(', ')}`),
		}),
		outputSchema: z.object({
			results: z.array(
				z.object({
					category: z.string(),
					description: z.string(),
					patternHint: z.string(),
					suggestedNodes: z.array(
						z.object({
							name: z.string(),
							note: z.string().optional(),
						}),
					),
				}),
			),
			unknownCategories: z.array(z.string()),
		}),
		// eslint-disable-next-line @typescript-eslint/require-await
		execute: async (input) => {
			const results: Array<{
				category: string;
				description: string;
				patternHint: string;
				suggestedNodes: Array<{ name: string; note?: string }>;
			}> = [];
			const unknownCategories: string[] = [];

			for (const cat of input.categories) {
				const data = suggestedNodesData[cat];
				if (data) {
					results.push({
						category: cat,
						description: data.description,
						patternHint: data.patternHint,
						suggestedNodes: data.nodes,
					});
				} else {
					unknownCategories.push(cat);
				}
			}

			return { results, unknownCategories };
		},
	});
}
