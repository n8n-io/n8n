/**
 * Simplified Node Search Tool for CodeWorkflowBuilder
 *
 * Provides a simpler search interface optimized for the code builder.
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
	const prefix = `[CODE-BUILDER][${timestamp}][SEARCH_TOOL]`;
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
 * Trigger node types that don't have "trigger" in their name
 * but still function as workflow entry points
 */
const TRIGGER_NODE_TYPES = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.cron', // Legacy schedule trigger
	'n8n-nodes-base.emailReadImap', // Email polling trigger
	'n8n-nodes-base.telegramBot', // Can act as webhook trigger
	'n8n-nodes-base.start', // Legacy trigger
]);

/**
 * Check if a node type is a trigger
 */
function isTriggerNodeType(type: string): boolean {
	if (TRIGGER_NODE_TYPES.has(type)) {
		return true;
	}
	return type.toLowerCase().includes('trigger');
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
 * Format builder hint for a node by reading from its node type definition
 */
function formatBuilderHint(
	nodeTypeParser: NodeTypeParser,
	nodeId: string,
	version: number,
): string {
	const nodeType = nodeTypeParser.getNodeType(nodeId, version);
	const hint = nodeType?.builderHint?.message;
	if (!hint) return '';
	return `  @builderHint ${hint}`;
}

/**
 * Get direct related nodes for a node ID from its node type definition
 */
function getDirectRelatedNodeIds(
	nodeTypeParser: NodeTypeParser,
	nodeId: string,
	version: number,
): string[] {
	const nodeType = nodeTypeParser.getNodeType(nodeId, version);
	return nodeType?.builderHint?.relatedNodes ?? [];
}

/**
 * Recursively collect all related nodes for a set of node IDs.
 * Uses a visited set to prevent infinite recursion from circular references.
 */
function collectAllRelatedNodeIds(
	nodeTypeParser: NodeTypeParser,
	initialNodeIds: Array<{ id: string; version: number }>,
	excludeNodeIds: Set<string>,
): Set<string> {
	const allRelated = new Set<string>();
	const visited = new Set<string>();

	// Add initial nodes to visited to avoid re-processing them
	for (const node of initialNodeIds) {
		visited.add(node.id);
	}

	// Also mark excluded nodes as visited
	for (const id of excludeNodeIds) {
		visited.add(id);
	}

	// Process queue of nodes to check for related nodes
	const queue: Array<{ id: string; version: number }> = [...initialNodeIds];

	while (queue.length > 0) {
		const current = queue.shift()!;
		const relatedIds = getDirectRelatedNodeIds(nodeTypeParser, current.id, current.version);

		for (const relatedId of relatedIds) {
			if (visited.has(relatedId)) {
				continue; // Already processed or excluded
			}

			visited.add(relatedId);
			allRelated.add(relatedId);

			// Get the related node's version and add to queue for recursive processing
			const relatedNodeType = nodeTypeParser.getNodeType(relatedId);
			if (relatedNodeType) {
				const relatedVersion = Array.isArray(relatedNodeType.version)
					? relatedNodeType.version[relatedNodeType.version.length - 1]
					: relatedNodeType.version;
				queue.push({ id: relatedId, version: relatedVersion });
			}
		}
	}

	return allRelated;
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
		lines.push(`        @builderHint ${mode.builderHint}`);
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
				lines.push(`          @builderHint ${resource.builderHint}`);
			}

			// Format operations
			lines.push('          operations:');
			for (const op of resource.operations) {
				lines.push(`            - ${op.value}`);
				if (op.description) {
					lines.push(`              ${op.description}`);
				}
				if (op.builderHint) {
					lines.push(`              @builderHint ${op.builderHint}`);
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
 * Create the simplified node search tool for code builder
 * Accepts multiple queries and returns separate results for each
 * Includes discriminator information for nodes with resource/operation or mode patterns
 */
export function createCodeBuilderSearchTool(nodeTypeParser: NodeTypeParser) {
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
					// Track which node IDs have been shown to avoid duplicates
					const shownNodeIds = new Set(results.map((node) => node.id));

					const allNodeLines: string[] = [];
					let totalRelatedCount = 0;

					for (const node of results) {
						// Format the search result node
						const triggerTag = node.isTrigger ? ' [TRIGGER]' : '';
						const basicInfo = `- ${node.id}${triggerTag}\n  Display Name: ${node.displayName}\n  Version: ${node.version}\n  Description: ${node.description}`;

						// Get builder hint
						const builderHint = formatBuilderHint(nodeTypeParser, node.id, node.version);

						// Get discriminator info
						const discInfo = getDiscriminatorInfo(nodeTypeParser, node.id, node.version);
						const discStr = formatDiscriminatorInfo(discInfo, node.id);

						const parts = [basicInfo];
						if (builderHint) parts.push(builderHint);
						if (discStr) parts.push(discStr);

						allNodeLines.push(parts.join('\n'));

						// Get related nodes for THIS specific search result
						const relatedNodeIds = collectAllRelatedNodeIds(
							nodeTypeParser,
							[{ id: node.id, version: node.version }],
							shownNodeIds,
						);

						// Add related nodes immediately after their parent search result
						for (const relatedId of relatedNodeIds) {
							const nodeType = nodeTypeParser.getNodeType(relatedId);
							if (nodeType) {
								const version = Array.isArray(nodeType.version)
									? nodeType.version[nodeType.version.length - 1]
									: nodeType.version;
								const relatedTriggerTag = isTriggerNodeType(relatedId) ? ' [TRIGGER]' : '';
								const relatedBasicInfo = `- ${relatedId}${relatedTriggerTag} [RELATED]\n  Display Name: ${nodeType.displayName}\n  Version: ${version}\n  Description: ${nodeType.description}`;

								// Get builder hint for related node too
								const relatedBuilderHint = formatBuilderHint(nodeTypeParser, relatedId, version);

								const relatedParts = [relatedBasicInfo];
								if (relatedBuilderHint) relatedParts.push(relatedBuilderHint);

								allNodeLines.push(relatedParts.join('\n'));

								// Mark as shown to prevent duplicates
								shownNodeIds.add(relatedId);
								totalRelatedCount++;
							}
						}
					}

					const countSuffix = totalRelatedCount > 0 ? ` (+ ${totalRelatedCount} related)` : '';

					allResults.push(
						`## "${query}"\nFound ${results.length} nodes${countSuffix}:\n\n${allNodeLines.join('\n\n')}`,
					);
				}
			}

			const response = `${allResults.join('\n\n---\n\n')}\n\nUse get_nodes to see the full TypeScript type definitions for these nodes.`;
			debugLog('Returning response', {
				responseLength: response.length,
				responsePreview: response,
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
