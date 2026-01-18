/**
 * Simplified Node Search Tool for One-Shot Workflow Code Agent
 *
 * Provides a simpler search interface optimized for the one-shot agent.
 * Searches nodes by name/description without the complex query structure
 * of the multi-agent system's search tool.
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { NodeTypeParser } from '../utils/node-type-parser';

/**
 * Create the simplified node search tool for one-shot agent
 */
export function createOneShotNodeSearchTool(nodeTypeParser: NodeTypeParser) {
	return tool(
		async (input: { query: string }) => {
			const results = nodeTypeParser.searchNodeTypes(input.query, 5);

			if (results.length === 0) {
				return `No nodes found matching "${input.query}". Try a different search term.`;
			}

			const resultLines = results.map((node) => {
				const triggerTag = node.isTrigger ? ' [TRIGGER]' : '';
				return `- ${node.id}${triggerTag}\n  Display Name: ${node.displayName}\n  Description: ${node.description}`;
			});

			return `Found ${results.length} nodes matching "${input.query}":\n\n${resultLines.join('\n\n')}\n\nUse get_node to see the full TypeScript type definition for any of these nodes.`;
		},
		{
			name: 'search_node',
			description:
				'Search for n8n nodes by name or service. Returns a list of node IDs matching the query. Use this when you need to find nodes for a specific integration or service (e.g., "salesforce", "http", "gmail").',
			schema: z.object({
				query: z.string().describe('Search query (e.g., "salesforce", "http", "gmail")'),
			}),
		},
	);
}
