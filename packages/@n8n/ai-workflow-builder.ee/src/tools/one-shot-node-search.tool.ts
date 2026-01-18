/**
 * Simplified Node Search Tool for One-Shot Workflow Code Agent
 *
 * Provides a simpler search interface optimized for the one-shot agent.
 * Searches nodes by name/description without the complex query structure
 * of the multi-agent system's search tool.
 *
 * POC with extensive debug logging for development.
 */

import { inspect } from 'node:util';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { NodeTypeParser } from '../utils/node-type-parser';

/**
 * Debug logging helper for search tool
 * Uses util.inspect for terminal-friendly output with full depth
 */
function debugLog(message: string, data?: Record<string, unknown>): void {
	const timestamp = new Date().toISOString();
	const prefix = `[ONE-SHOT-AGENT][${timestamp}][SEARCH_TOOL]`;
	if (data) {
		const formatted = inspect(data, {
			depth: null,
			colors: true,
			maxStringLength: null,
			maxArrayLength: null,
			breakLength: 120,
		});
		console.log(`${prefix} ${message}\n${formatted}`);
	} else {
		console.log(`${prefix} ${message}`);
	}
}

/**
 * Create the simplified node search tool for one-shot agent
 */
export function createOneShotNodeSearchTool(nodeTypeParser: NodeTypeParser) {
	debugLog('Creating search_node tool');

	return tool(
		async (input: { query: string }) => {
			debugLog('========== SEARCH_NODE TOOL INVOKED ==========');
			debugLog('Input', { query: input.query });

			const searchStartTime = Date.now();
			const results = nodeTypeParser.searchNodeTypes(input.query, 5);
			const searchDuration = Date.now() - searchStartTime;

			debugLog('Search complete', {
				searchDurationMs: searchDuration,
				resultCount: results.length,
				results: results.map((node) => ({
					id: node.id,
					displayName: node.displayName,
					isTrigger: node.isTrigger,
				})),
			});

			if (results.length === 0) {
				const response = `No nodes found matching "${input.query}". Try a different search term.`;
				debugLog('Returning empty response', { response });
				return response;
			}

			const resultLines = results.map((node) => {
				const triggerTag = node.isTrigger ? ' [TRIGGER]' : '';
				return `- ${node.id}${triggerTag}\n  Display Name: ${node.displayName}\n  Description: ${node.description}`;
			});

			const response = `Found ${results.length} nodes matching "${input.query}":\n\n${resultLines.join('\n\n')}\n\nUse get_node to see the full TypeScript type definition for any of these nodes.`;
			debugLog('Returning response', {
				responseLength: response.length,
				responsePreview: response.substring(0, 500),
			});
			debugLog('========== SEARCH_NODE TOOL COMPLETE ==========');

			return response;
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
