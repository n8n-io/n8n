/**
 * Simplified Node Search Tool for CodeWorkflowBuilder
 *
 * Provides a simpler search interface optimized for the code builder.
 * Searches nodes by name/description without the complex query structure
 * of the multi-agent system's search tool.
 *
 * Includes discriminator information (resource/operation, mode) so the agent
 * knows what parameters to pass to get_nodes for split type files.
 */

import { tool } from '@langchain/core/tools';
import type { IParameterBuilderHint, IRelatedNode } from 'n8n-workflow';
import { z } from 'zod';

import {
	extractResourceOperations,
	type ResourceInfo,
	type OperationInfo,
} from '../../utils/resource-operation-extractor';
import {
	extractModeDiscriminator,
	extractOperationOnlyDiscriminator,
	type ModeInfo,
} from '../utils/discriminator-utils';
import type { NodeTypeParser, ParsedNodeType } from '../utils/node-type-parser';

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
export function isTriggerNodeType(type: string): boolean {
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
	builderHint?: IParameterBuilderHint;
}

/**
 * Simplified resource info for discriminator display
 */
interface DiscriminatorResourceInfo {
	value: string;
	description?: string;
	builderHint?: IParameterBuilderHint;
	operations: DiscriminatorOperationInfo[];
}

/**
 * Discriminator info structure for search results
 */
interface DiscriminatorInfo {
	type: 'resource_operation' | 'operation' | 'mode' | 'none';
	resources?: DiscriminatorResourceInfo[];
	operations?: DiscriminatorOperationInfo[];
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
 * Get direct related node IDs for a node from its builderHint.relatedNodes.
 */
function getDirectRelatedNodeIds(
	nodeTypeParser: NodeTypeParser,
	nodeId: string,
	version: number,
): string[] {
	const nodeType = nodeTypeParser.getNodeType(nodeId, version);
	const relatedNodes = nodeType?.builderHint?.relatedNodes;
	if (!relatedNodes) return [];

	return relatedNodes.map((r) => r.nodeType);
}

/**
 * Get related nodes with their hints.
 */
function getRelatedNodesWithHints(
	nodeTypeParser: NodeTypeParser,
	nodeId: string,
	version: number,
): IRelatedNode[] | undefined {
	const nodeType = nodeTypeParser.getNodeType(nodeId, version);
	return nodeType?.builderHint?.relatedNodes;
}

/**
 * Format related nodes with hints for display.
 * Returns formatted string or empty string if no related nodes with hints.
 */
function formatRelatedNodesWithHints(relatedNodes: IRelatedNode[]): string {
	if (relatedNodes.length === 0) return '';

	const lines = ['  @relatedNodes'];
	for (const related of relatedNodes) {
		lines.push(`    - ${related.nodeType}: "${related.relationHint}"`);
	}
	return lines.join('\n');
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
 * Display name overrides for confusing mode names
 * Maps mode value -> original display name -> clearer display name
 */
const MODE_DISPLAY_NAME_OVERRIDES: Record<string, Record<string, string>> = {
	retrieve: {
		'Retrieve Documents (As Vector Store for Chain/Tool)':
			'Retrieve Documents (As Vector Store for Chain)',
	},
};

/**
 * Format a mode for display, including SDK function mapping only if showSdkMapping is true
 */
function formatModeForDisplay(mode: ModeInfo, showSdkMapping: boolean): string {
	const lines: string[] = [];

	// Apply display name override if available (to remove confusing text)
	const displayName =
		MODE_DISPLAY_NAME_OVERRIDES[mode.value]?.[mode.displayName] ?? mode.displayName;

	// First line: value and display name
	let firstLine = `      - ${mode.value}: "${displayName}"`;

	// Add SDK mapping if applicable
	if (showSdkMapping) {
		const sdkMapping = mode.outputConnectionType
			? CONNECTION_TYPE_TO_SDK[mode.outputConnectionType]
			: undefined;

		if (sdkMapping) {
			// Include mode parameter in the SDK function call for clarity
			const fnWithMode = sdkMapping.fn.replace('()', `({ mode: '${mode.value}' })`);
			firstLine += ` → use ${fnWithMode} for ${sdkMapping.subnodeField}`;
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
		lines.push(`        @builderHint ${mode.builderHint.message}`);
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
	// Include description and builderHint for code-builder's detailed output
	const resourceOps = extractResourceOperations(nodeType, version, undefined, {
		fields: { description: true, builderHint: true },
	});
	if (resourceOps && resourceOps.resources.length > 0) {
		const resources: DiscriminatorResourceInfo[] = resourceOps.resources
			.filter((r: ResourceInfo) => r.value !== '__CUSTOM_API_CALL__')
			.map((r: ResourceInfo) => ({
				value: r.value,
				description: r.description,
				builderHint: r.builderHint,
				operations: r.operations
					.filter((op: OperationInfo) => op.value !== '__CUSTOM_API_CALL__')
					.map((op: OperationInfo) => ({
						value: op.value,
						description: op.description,
						builderHint: op.builderHint,
					})),
			}));

		if (resources.length > 0) {
			return { type: 'resource_operation', resources };
		}
	}

	// Check for operation-only pattern (operation without resource)
	const operationOnly = extractOperationOnlyDiscriminator(nodeType, version);
	if (operationOnly && operationOnly.operations.length > 0) {
		const operations: DiscriminatorOperationInfo[] = operationOnly.operations
			.filter((op) => op.value !== '__CUSTOM_API_CALL__')
			.map((op) => ({
				value: op.value,
				description: op.description,
				builderHint: op.builderHint,
			}));

		if (operations.length > 0) {
			return { type: 'operation', operations };
		}
	}

	// Check for mode pattern
	const modeInfo = extractModeDiscriminator(nodeType, version);
	if (modeInfo && modeInfo.modes.length > 0) {
		return { type: 'mode', modes: modeInfo.modes };
	}

	return { type: 'none' };
}

function formatResourceOperationLines(
	resources: DiscriminatorResourceInfo[],
	nodeId: string,
): string[] {
	const lines: string[] = ['    resource:'];
	for (const resource of resources) {
		lines.push(`      - ${resource.value}:`);
		if (resource.description) {
			lines.push(`          ${resource.description}`);
		}
		if (resource.builderHint) {
			lines.push(`          @builderHint ${resource.builderHint.message}`);
		}

		lines.push('          operations:');
		for (const op of resource.operations) {
			lines.push(`            - ${op.value}`);
			if (op.description) {
				lines.push(`              ${op.description}`);
			}
			if (op.builderHint) {
				lines.push(`              @builderHint ${op.builderHint.message}`);
			}
		}
	}

	const firstResource = resources[0];
	const firstOp = firstResource?.operations[0]?.value || 'get';
	lines.push('');
	lines.push('  Use get_node_types with discriminators:');
	lines.push(
		`    get_node_types({ nodeIds: [{ nodeId: "${nodeId}", resource: "${firstResource?.value}", operation: "${firstOp}" }] })`,
	);
	return lines;
}

function formatOperationLines(operations: DiscriminatorOperationInfo[], nodeId: string): string[] {
	const lines: string[] = ['    operation:'];
	for (const op of operations) {
		lines.push(`      - ${op.value}`);
		if (op.description) {
			lines.push(`        ${op.description}`);
		}
		if (op.builderHint) {
			lines.push(`        @builderHint ${op.builderHint.message}`);
		}
	}

	const firstOp = operations[0]?.value ?? 'default';
	lines.push('');
	lines.push('  Use get_node_types with discriminators:');
	lines.push(`    get_node_types({ nodeIds: [{ nodeId: "${nodeId}", operation: "${firstOp}" }] })`);
	return lines;
}

function formatModeLines(modes: ModeInfo[], nodeId: string): string[] {
	const lines: string[] = ['    mode:'];
	const hasSubnodeModes = modes.some((m) => m.outputConnectionType);
	for (const mode of modes) {
		lines.push(formatModeForDisplay(mode, hasSubnodeModes));
	}

	const firstMode = modes[0];
	lines.push('');
	lines.push('  Use get_node_types with discriminators:');
	lines.push(
		`    get_node_types({ nodeIds: [{ nodeId: "${nodeId}", mode: "${firstMode.value}" }] })`,
	);
	return lines;
}

/**
 * Format discriminator info for display in search results
 */
function formatDiscriminatorInfo(info: DiscriminatorInfo, nodeId: string): string {
	if (info.type === 'none') {
		return '  Discriminators: none (use node directly without resource/operation/mode)';
	}

	const lines: string[] = ['  Discriminators:'];

	if (info.type === 'resource_operation' && info.resources) {
		lines.push(...formatResourceOperationLines(info.resources, nodeId));
	} else if (info.type === 'operation' && info.operations) {
		lines.push(...formatOperationLines(info.operations, nodeId));
	} else if (info.type === 'mode' && info.modes) {
		lines.push(...formatModeLines(info.modes, nodeId));
	}

	return lines.join('\n');
}

/**
 * Format a single node result with basic info, builder hint, related nodes, and discriminators.
 * Produces the same text block that the search tool generates for each node.
 *
 * Returns `undefined` if the node is not found in the parser.
 */
export function formatNodeResult(
	nodeTypeParser: NodeTypeParser,
	nodeId: string,
	version?: number,
): string | undefined {
	const nodeType = nodeTypeParser.getNodeType(nodeId, version);
	if (!nodeType) return undefined;

	const resolvedVersion =
		version ?? (Array.isArray(nodeType.version) ? Math.max(...nodeType.version) : nodeType.version);

	const triggerTag = isTriggerNodeType(nodeId) ? ' [TRIGGER]' : '';
	const basicInfo = `- ${nodeId}${triggerTag}\n  Display Name: ${nodeType.displayName}\n  Version: ${resolvedVersion}\n  Description: ${nodeType.description}`;

	const builderHint = formatBuilderHint(nodeTypeParser, nodeId, resolvedVersion);

	const relatedNodesWithHints = getRelatedNodesWithHints(nodeTypeParser, nodeId, resolvedVersion);

	const discInfo = getDiscriminatorInfo(nodeTypeParser, nodeId, resolvedVersion);
	const discStr = formatDiscriminatorInfo(discInfo, nodeId);

	const parts = [basicInfo];
	if (builderHint) parts.push(builderHint);

	if (relatedNodesWithHints && relatedNodesWithHints.length > 0) {
		const relatedNodesStr = formatRelatedNodesWithHints(relatedNodesWithHints);
		if (relatedNodesStr) parts.push(relatedNodesStr);
	}

	if (discStr) parts.push(discStr);
	return parts.join('\n');
}

/**
 * Create the simplified node search tool for code builder
 * Accepts multiple queries and returns separate results for each
 * Includes discriminator information for nodes with resource/operation or mode patterns
 */
export function createCodeBuilderSearchTool(nodeTypeParser: NodeTypeParser) {
	return tool(
		async (input: { queries: string[] }) => {
			const allResults: string[] = [];

			for (const query of input.queries) {
				const results = nodeTypeParser.searchNodeTypes(query, 5);

				if (results.length === 0) {
					allResults.push(`## "${query}"\nNo nodes found. Try a different search term.`);
				} else {
					// Track which node IDs have been shown to avoid duplicates
					const shownNodeIds = new Set<string>(results.map((node: ParsedNodeType) => node.id));

					const allNodeLines: string[] = [];
					let totalRelatedCount = 0;

					for (const node of results) {
						// Format the search result node
						const triggerTag = node.isTrigger ? ' [TRIGGER]' : '';
						const basicInfo = `- ${node.id}${triggerTag}\n  Display Name: ${node.displayName}\n  Version: ${node.version}\n  Description: ${node.description}`;

						// Get builder hint
						const builderHint = formatBuilderHint(nodeTypeParser, node.id, node.version);

						// Check for new relatedNodes format with hints
						const relatedNodesWithHints = getRelatedNodesWithHints(
							nodeTypeParser,
							node.id,
							node.version,
						);

						// Get discriminator info
						const discInfo = getDiscriminatorInfo(nodeTypeParser, node.id, node.version);
						const discStr = formatDiscriminatorInfo(discInfo, node.id);

						const parts = [basicInfo];
						if (builderHint) parts.push(builderHint);

						// If using new format with hints, display @relatedNodes section instead of expanding
						if (relatedNodesWithHints && relatedNodesWithHints.length > 0) {
							const relatedNodesStr = formatRelatedNodesWithHints(relatedNodesWithHints);
							if (relatedNodesStr) parts.push(relatedNodesStr);
						} else {
							// Legacy format: expand related nodes as [RELATED] entries
							const relatedNodeIds = collectAllRelatedNodeIds(
								nodeTypeParser,
								[{ id: node.id, version: node.version }],
								shownNodeIds,
							);

							// Add related nodes immediately after their parent search result
							// First, add discriminator info to current node
							if (discStr) parts.push(discStr);
							allNodeLines.push(parts.join('\n'));

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

									// Get discriminator info for related node
									const relatedDiscInfo = getDiscriminatorInfo(nodeTypeParser, relatedId, version);
									const relatedDiscStr = formatDiscriminatorInfo(relatedDiscInfo, relatedId);

									const relatedParts = [relatedBasicInfo];
									if (relatedBuilderHint) relatedParts.push(relatedBuilderHint);
									if (relatedDiscStr) relatedParts.push(relatedDiscStr);

									allNodeLines.push(relatedParts.join('\n'));

									// Mark as shown to prevent duplicates
									shownNodeIds.add(relatedId);
									totalRelatedCount++;
								}
							}
							continue; // Skip the common push below since we handled it in the legacy branch
						}

						if (discStr) parts.push(discStr);
						allNodeLines.push(parts.join('\n'));
					}

					const countSuffix = totalRelatedCount > 0 ? ` (+ ${totalRelatedCount} related)` : '';

					allResults.push(
						`## "${query}"\nFound ${results.length} nodes${countSuffix}:\n\n${allNodeLines.join('\n\n')}`,
					);
				}
			}

			const response = allResults.join('\n\n---\n\n');

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
