/**
 * LangChain `tool()` wrapper for "suggested nodes by category". The actual
 * lookup logic lives in `@n8n/ai-utilities/node-catalog` so non-LangChain
 * callers can re-use it.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import {
	getSuggestedNodes,
	categoryList,
	type NodeTypeParser,
} from '@n8n/ai-utilities/node-catalog';

export { getSuggestedNodes, categoryList } from '@n8n/ai-utilities/node-catalog';

const GetSuggestedNodesSchema = z.object({
	categories: z
		.array(z.string())
		.describe('List of workflow technique categories to get node suggestions for'),
});

type GetSuggestedNodesInput = z.infer<typeof GetSuggestedNodesSchema>;

export function createGetSuggestedNodesTool(nodeTypeParser: NodeTypeParser) {
	return new DynamicStructuredTool({
		name: 'get_suggested_nodes',
		description: `Returns curated node recommendations by workflow technique category.

Available categories: ${categoryList.join(', ')}`,
		schema: GetSuggestedNodesSchema,
		func: async (input: GetSuggestedNodesInput): Promise<string> => {
			return getSuggestedNodes(nodeTypeParser, input.categories);
		},
	});
}
