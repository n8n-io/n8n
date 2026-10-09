/**
 * LangChain `tool()` wrapper for the simplified node search used by the
 * code-builder agent. The actual search logic and result formatting live in
 * `@n8n/ai-utilities/node-catalog` so non-LangChain callers (e.g. the cli's
 * NodeCatalogService) can re-use it without pulling in LangChain.
 */

import { tool } from '@langchain/core/tools';
import {
	searchCodeBuilderNodes,
	type CodeBuilderSearchToolOptions,
	type NodeTypeParser,
} from '@n8n/ai-utilities/node-catalog';
import { z } from 'zod';

import type { RestrictedNodeType } from '@/workflow-builder-agent';
import { describeRestrictedMatches } from '@/utils/restricted-node-notes';

/**
 * Create the simplified node search tool for code builder.
 * Accepts multiple queries and returns separate results for each.
 * Includes discriminator information for nodes with resource/operation or mode patterns.
 */
export function createCodeBuilderSearchTool(
	nodeTypeParser: NodeTypeParser,
	options?: CodeBuilderSearchToolOptions,
	restrictedNodeTypes?: readonly RestrictedNodeType[],
) {
	return tool(
		async (input: { queries: string[] }) => {
			const { results } = searchCodeBuilderNodes(nodeTypeParser, input.queries, options);
			const restricted = describeRestrictedMatches(input.queries, restrictedNodeTypes);

			return restricted ? `${results}\n\n${restricted}` : results;
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
