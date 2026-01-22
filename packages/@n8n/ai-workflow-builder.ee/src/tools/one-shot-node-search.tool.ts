/**
 * Simplified Node Search Tool for One-Shot Workflow Code Agent
 *
 * Provides a simpler search interface optimized for the one-shot agent.
 * Searches nodes by name/description without the complex query structure
 * of the multi-agent system's search tool.
 *
 * Includes discriminator information (resource/operation, mode) so the agent
 * knows what parameters to pass to get_nodes for split type files.
 *
 * POC with extensive debug logging for development.
 */

import { inspect } from 'node:util';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { NodeTypeParser } from '../utils/node-type-parser';
import { extractResourceOperations } from '../utils/resource-operation-extractor';
import { extractModeDiscriminator } from './utils/discriminator-utils';

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
 * Discriminator info structure for search results
 */
interface DiscriminatorInfo {
	type: 'resource_operation' | 'mode' | 'none';
	resources?: Array<{ value: string; operations: string[] }>;
	modes?: string[];
}

/**
 * Extract discriminator info from a node type
 * Returns resource/operation, mode, or none
 */
function getDiscriminatorInfo(
	nodeTypeParser: NodeTypeParser,
	nodeId: string,
	version: number,
): DiscriminatorInfo {
	const nodeType = nodeTypeParser.getNodeType(nodeId, version);
	if (!nodeType) {
		return { type: 'none' };
	}

	// Check for resource/operation pattern
	const resourceOps = extractResourceOperations(nodeType, version);
	if (resourceOps && resourceOps.resources.length > 0) {
		const resources = resourceOps.resources
			.filter((r) => r.value !== '__CUSTOM_API_CALL__')
			.map((r) => ({
				value: r.value,
				operations: r.operations
					.filter((op) => op.value !== '__CUSTOM_API_CALL__')
					.map((op) => op.value),
			}));

		if (resources.length > 0) {
			return { type: 'resource_operation', resources };
		}
	}

	// Check for mode pattern
	const modeInfo = extractModeDiscriminator(nodeType, version);
	if (modeInfo && modeInfo.modes.length > 0) {
		return { type: 'mode', modes: modeInfo.modes };
	}

	return { type: 'none' };
}

/**
 * Format discriminator info for display in search results
 */
function formatDiscriminatorInfo(info: DiscriminatorInfo, nodeId: string): string {
	if (info.type === 'none') {
		return '';
	}

	const lines: string[] = ['  Discriminators:'];

	if (info.type === 'resource_operation' && info.resources) {
		lines.push('    resource:');
		for (const resource of info.resources) {
			const ops = resource.operations.join(', ');
			lines.push(`      - ${resource.value} (operations: ${ops})`);
		}

		// Add usage hint
		const firstResource = info.resources[0];
		const firstOp = firstResource?.operations[0] || 'get';
		lines.push('');
		lines.push('  Use get_nodes with discriminators:');
		lines.push(
			`    get_nodes({ nodeIds: [{ nodeId: "${nodeId}", resource: "${firstResource?.value}", operation: "${firstOp}" }] })`,
		);
	} else if (info.type === 'mode' && info.modes) {
		lines.push(`    mode: ${info.modes.join(', ')}`);

		// Add usage hint
		const firstMode = info.modes[0];
		lines.push('');
		lines.push('  Use get_nodes with discriminators:');
		lines.push(`    get_nodes({ nodeIds: [{ nodeId: "${nodeId}", mode: "${firstMode}" }] })`);
	}

	return lines.join('\n');
}

/**
 * Create the simplified node search tool for one-shot agent
 * Accepts multiple queries and returns separate results for each
 * Includes discriminator information for nodes with resource/operation or mode patterns
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
						const basicInfo = `- ${node.id}${triggerTag}\n  Display Name: ${node.displayName}\n  Description: ${node.description}`;

						// Get discriminator info
						const discInfo = getDiscriminatorInfo(nodeTypeParser, node.id, node.version);
						const discStr = formatDiscriminatorInfo(discInfo, node.id);

						return discStr ? `${basicInfo}\n${discStr}` : basicInfo;
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
