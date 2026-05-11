/**
 * LangChain `tool()` wrapper for the simplified node search used by the
 * code-builder agent. The actual search logic and result formatting live in
 * `@n8n/ai-utilities/node-catalog` so non-LangChain callers (e.g. the cli's
 * NodeCatalogService) can re-use it without pulling in LangChain.
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import {
	searchCodeBuilderNodes,
	type CodeBuilderSearchToolOptions,
	type NodeTypeParser,
} from '@n8n/ai-utilities/node-catalog';

export {
	searchCodeBuilderNodes,
	formatNodeResult,
} from '@n8n/ai-utilities/node-catalog';
export type {
	CodeBuilderSearchResult,
	CodeBuilderSearchToolOptions,
} from '@n8n/ai-utilities/node-catalog';

/**
 * Create the simplified node search tool for code builder.
 * Accepts multiple queries and returns separate results for each.
 * Includes discriminator information for nodes with resource/operation or mode patterns.
 */
export function createCodeBuilderSearchTool(
	nodeTypeParser: NodeTypeParser,
	options?: CodeBuilderSearchToolOptions,
) {
	return tool(
		async (input: { queries: string[] }) => {
			return searchCodeBuilderNodes(nodeTypeParser, input.queries, options).results;
		},
		{
			name: 'search_nodes',
			description:
				'Search for n8n nodes by name or service. Accepts multiple search queries and returns separate result lists for each. Use this when you need to find nodes for specific integrations or services (e.g., ["salesforce", "http", "gmail"]).',
			schema: z.object({
				queries: z
					.array(z.string())
					.describe('Array of search queries (e.g., ["salesforce", "http", "gmail"])'),
			}),
		},
	);
}
