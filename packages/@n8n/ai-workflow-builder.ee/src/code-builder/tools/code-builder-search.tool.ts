/**
 * LangChain wrapper for the code-builder node-search tool.
 *
 * The pure-function implementation lives in `@n8n/ai-utilities` so that
 * callers (e.g. the MCP server, OTel-traced agents) can call it directly
 * without registering a LangSmith root run via the global LangChain tracer.
 */

import { tool } from '@langchain/core/tools';
import {
	searchCodeBuilderNodes,
	type CodeBuilderSearchToolOptions,
	type NodeTypeParser,
} from '@n8n/ai-utilities';
import { z } from 'zod';

/**
 * Create the simplified node search tool for code builder
 * Accepts multiple queries and returns separate results for each
 * Includes discriminator information for nodes with resource/operation or mode patterns
 */
export function createCodeBuilderSearchTool(
	nodeTypeParser: NodeTypeParser,
	options?: CodeBuilderSearchToolOptions,
) {
	return tool(
		async (input: { queries: string[] }) =>
			searchCodeBuilderNodes(nodeTypeParser, input.queries, options).results,
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
