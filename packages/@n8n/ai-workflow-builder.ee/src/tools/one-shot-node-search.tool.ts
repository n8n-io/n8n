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
 * Accepts multiple queries and returns separate results for each
 */
export function createOneShotNodeSearchTool(nodeTypeParser: NodeTypeParser) {
	debugLog('Creating search_nodes tool');

	return tool(
		async (input: { queries: string[] }) => {
			debugLog('========== SEARCH_NODES TOOL INVOKED ==========');
			debugLog('Input', { queries: input.queries });

			const allResults: string[] = [];

			for (const query of input.queries) {
				const searchStartTime = Date.now();
				const results = nodeTypeParser.searchNodeTypes(query, 5);
				const searchDuration = Date.now() - searchStartTime;

				debugLog(`Search complete for "${query}"`, {
					searchDurationMs: searchDuration,
					resultCount: results.length,
					results: results.map((node) => ({
						id: node.id,
						displayName: node.displayName,
						isTrigger: node.isTrigger,
					})),
				});

				if (results.length === 0) {
					allResults.push(`## "${query}"\nNo nodes found. Try a different search term.`);
				} else {
					const resultLines = results.map((node) => {
						const triggerTag = node.isTrigger ? ' [TRIGGER]' : '';
						return `- ${node.id}${triggerTag}\n  Display Name: ${node.displayName}\n  Description: ${node.description}`;
					});
					allResults.push(
						`## "${query}"\nFound ${results.length} nodes:\n\n${resultLines.join('\n\n')}`,
					);
				}
			}

			const response = `${allResults.join('\n\n---\n\n')}\n\nUse get_nodes to see the full TypeScript type definitions for these nodes.`;
			debugLog('Returning response', {
				responseLength: response.length,
				responsePreview: response.substring(0, 500),
			});
			debugLog('========== SEARCH_NODES TOOL COMPLETE ==========');

			return response;
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
