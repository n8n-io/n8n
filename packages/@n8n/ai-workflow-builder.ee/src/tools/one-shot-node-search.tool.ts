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
import { extractModeDiscriminator, type ModeInfo } from './utils/discriminator-utils';

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
 * Simplified operation info for discriminator display
 */
interface DiscriminatorOperationInfo {
	value: string;
	description?: string;
	builderHint?: string;
}

/**
 * Simplified resource info for discriminator display
 */
interface DiscriminatorResourceInfo {
	value: string;
	description?: string;
	builderHint?: string;
	operations: DiscriminatorOperationInfo[];
}

/**
 * Discriminator info structure for search results
 */
interface DiscriminatorInfo {
	type: 'resource_operation' | 'mode' | 'none';
	resources?: DiscriminatorResourceInfo[];
	modes?: ModeInfo[];
}

/**
 * Maps NodeConnectionType to SDK function and subnode field
 */
const CONNECTION_TYPE_TO_SDK: Record<string, { fn: string; subnodeField: string }> = {
	ai_tool: { fn: 'tool()', subnodeField: 'subnodes.tools' },
	ai_vectorStore: { fn: 'vectorStore()', subnodeField: 'subnodes.vectorStore' },
	ai_retriever: { fn: 'retriever()', subnodeField: 'subnodes.retriever' },
	ai_languageModel: { fn: 'languageModel()', subnodeField: 'subnodes.model' },
	ai_memory: { fn: 'memory()', subnodeField: 'subnodes.memory' },
	ai_outputParser: { fn: 'outputParser()', subnodeField: 'subnodes.outputParser' },
	ai_embedding: { fn: 'embeddings()', subnodeField: 'subnodes.embeddings' },
	ai_document: { fn: 'documentLoader()', subnodeField: 'subnodes.documentLoader' },
	ai_textSplitter: { fn: 'textSplitter()', subnodeField: 'subnodes.textSplitter' },
};

/**
 * Format a mode for display, including SDK function mapping only if showSdkMapping is true
 */
function formatModeForDisplay(mode: ModeInfo, showSdkMapping: boolean): string {
	const lines: string[] = [];

	// First line: value and display name
	let firstLine = `      - ${mode.value}: "${mode.displayName}"`;

	// Add SDK mapping if applicable
	if (showSdkMapping) {
		const sdkMapping = mode.outputConnectionType
			? CONNECTION_TYPE_TO_SDK[mode.outputConnectionType as string]
			: undefined;

		if (sdkMapping) {
			firstLine += ` → use ${sdkMapping.fn} for ${sdkMapping.subnodeField}`;
		} else {
			firstLine += ' → use node()';
		}
	}

	lines.push(firstLine);

	// Add description if available
	if (mode.description) {
		lines.push(`        ${mode.description}`);
	}

	// Add builder hint if available
	if (mode.builderHint) {
		lines.push(`        Hint: ${mode.builderHint}`);
	}

	return lines.join('\n');
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
		const resources: DiscriminatorResourceInfo[] = resourceOps.resources
			.filter((r) => r.value !== '__CUSTOM_API_CALL__')
			.map((r) => ({
				value: r.value,
				description: r.description,
				builderHint: r.builderHint,
				operations: r.operations
					.filter((op) => op.value !== '__CUSTOM_API_CALL__')
					.map((op) => ({
						value: op.value,
						description: op.description,
						builderHint: op.builderHint,
					})),
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
			// Format resource line
			lines.push(`      - ${resource.value}:`);
			if (resource.description) {
				lines.push(`          ${resource.description}`);
			}
			if (resource.builderHint) {
				lines.push(`          Hint: ${resource.builderHint}`);
			}

			// Format operations
			lines.push('          operations:');
			for (const op of resource.operations) {
				lines.push(`            - ${op.value}`);
				if (op.description) {
					lines.push(`              ${op.description}`);
				}
				if (op.builderHint) {
					lines.push(`              Hint: ${op.builderHint}`);
				}
			}
		}

		// Add usage hint
		const firstResource = info.resources[0];
		const firstOp = firstResource?.operations[0]?.value || 'get';
		lines.push('');
		lines.push('  Use get_nodes with discriminators:');
		lines.push(
			`    get_nodes({ nodeIds: [{ nodeId: "${nodeId}", resource: "${firstResource?.value}", operation: "${firstOp}" }] })`,
		);
	} else if (info.type === 'mode' && info.modes) {
		lines.push('    mode:');
		// Only show SDK function mapping if there's variation (some modes have outputConnectionType)
		const hasSubnodeModes = info.modes.some((m) => m.outputConnectionType);
		for (const mode of info.modes) {
			lines.push(formatModeForDisplay(mode, hasSubnodeModes));
		}

		// Add usage hint with first mode value
		const firstMode = info.modes[0];
		lines.push('');
		lines.push('  Use get_nodes with discriminators:');
		lines.push(`    get_nodes({ nodeIds: [{ nodeId: "${nodeId}", mode: "${firstMode.value}" }] })`);
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
						const basicInfo = `- ${node.id}${triggerTag}\n  Display Name: ${node.displayName}\n  Version: ${node.version}\n  Description: ${node.description}`;

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
