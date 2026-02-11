/**
 * Code Builder Node Search Engine
 *
 * This is a fork of tools/engines/node-search-engine.ts for the code-builder agent.
 * It includes additional features for subnode requirements, related subnodes, and
 * builder hints that are specific to the code-builder workflow generation approach.
 *
 * The original node-search-engine.ts is used by the multi-agent system and has
 * different requirements.
 */

import { sublimeSearch } from '@n8n/utils';
import type { BuilderHintInputs, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { CodeBuilderNodeSearchResult, SubnodeRequirement } from '../types';

/** Type guard for NodeConnectionType */
function isNodeConnectionType(value: string): value is NodeConnectionType {
	return Object.values(NodeConnectionTypes).includes(value as NodeConnectionType);
}

/**
 * Default subnodes for each connection type
 * These are sensible defaults shown in search results
 */
const DEFAULT_SUBNODES: Record<string, string[]> = {
	ai_languageModel: ['@n8n/n8n-nodes-langchain.lmChatOpenAi'],
	ai_memory: ['@n8n/n8n-nodes-langchain.memoryBufferWindow'],
	ai_embedding: ['@n8n/n8n-nodes-langchain.embeddingsOpenAi'],
	ai_vectorStore: ['@n8n/n8n-nodes-langchain.vectorStoreInMemory'],
	// ai_tool is intentionally excluded - varies by use case
};

/**
 * Search keys configuration for sublimeSearch
 * Keys are ordered by importance with corresponding weights
 */
const NODE_SEARCH_KEYS = [
	{ key: 'displayName', weight: 1.5 },
	{ key: 'name', weight: 1.3 },
	{ key: 'codex.alias', weight: 1.0 },
	{ key: 'description', weight: 0.7 },
];

/**
 * Extract the short type name from a full node name
 * e.g., "n8n-nodes-base.set" -> "set"
 */
function getTypeName(nodeName: string): string {
	if (!nodeName) return '';
	const lastDotIndex = nodeName.lastIndexOf('.');
	return lastDotIndex >= 0 ? nodeName.substring(lastDotIndex + 1) : nodeName;
}

/**
 * Scoring weights for connection type matching
 */
export const SCORE_WEIGHTS = {
	CONNECTION_EXACT: 100,
	CONNECTION_IN_EXPRESSION: 50,
} as const;

function getLatestVersion(version: number | number[]): number {
	return Array.isArray(version) ? Math.max(...version) : version;
}

/**
 * Extract subnode requirements from builderHint.inputs
 */
function extractSubnodeRequirements(inputs?: BuilderHintInputs): SubnodeRequirement[] {
	if (!inputs) return [];

	return Object.entries(inputs).map(([connectionType, config]) => ({
		connectionType,
		required: config.required,
		...(config.displayOptions && { displayOptions: config.displayOptions }),
	}));
}

function dedupeNodes(nodes: INodeTypeDescription[]): INodeTypeDescription[] {
	const dedupeCache: Record<string, INodeTypeDescription> = {};
	nodes.forEach((node) => {
		const cachedNodeType = dedupeCache[node.name];
		if (!cachedNodeType) {
			dedupeCache[node.name] = node;
			return;
		}

		const cachedVersion = getLatestVersion(cachedNodeType.version);
		const nextVersion = getLatestVersion(node.version);

		if (nextVersion > cachedVersion) {
			dedupeCache[node.name] = node;
		}
	});

	return Object.values(dedupeCache);
}

/**
 * Pure business logic for searching nodes
 * Separated from tool infrastructure for better testability
 */
export class CodeBuilderNodeSearchEngine {
	private readonly nodeTypes: INodeTypeDescription[];
	constructor(nodeTypes: INodeTypeDescription[]) {
		this.nodeTypes = dedupeNodes(nodeTypes);
	}

	/**
	 * Search nodes by name, display name, or description
	 * Always return the latest version of a node
	 * @param query - The search query string
	 * @param limit - Maximum number of results to return
	 * @returns Array of matching nodes sorted by relevance
	 */
	searchByName(query: string, limit: number = 20): CodeBuilderNodeSearchResult[] {
		// Use sublimeSearch for fuzzy matching
		const searchResults = sublimeSearch<INodeTypeDescription>(
			query,
			this.nodeTypes,
			NODE_SEARCH_KEYS,
		);

		const queryLower = query.toLowerCase().trim();
		const fuzzyResultNames = new Set(searchResults.map((r) => r.item.name));

		// Direct type name match on all nodeTypes (catches nodes sublimeSearch ranked too low)
		const typeNameMatches = this.nodeTypes
			.filter((node) => {
				if (fuzzyResultNames.has(node.name)) return false;
				return getTypeName(node.name).toLowerCase() === queryLower;
			})
			.map((item) => ({ item, score: 0 }));

		// Merge and sort: exact type name matches first, then by fuzzy score
		const allResults = [...searchResults, ...typeNameMatches];
		allResults.sort((a, b) => {
			const exactA = getTypeName(a.item.name).toLowerCase() === queryLower;
			const exactB = getTypeName(b.item.name).toLowerCase() === queryLower;
			if (exactA && !exactB) return -1;
			if (!exactA && exactB) return 1;
			return b.score - a.score;
		});

		// Apply limit and map to result format
		return allResults
			.slice(0, limit)
			.map(
				({
					item,
					score,
				}: { item: INodeTypeDescription; score: number }): CodeBuilderNodeSearchResult => {
					const subnodeRequirements = extractSubnodeRequirements(item.builderHint?.inputs);
					return {
						name: item.name,
						displayName: item.displayName,
						description: item.description ?? 'No description available',
						version: getLatestVersion(item.version),
						inputs: item.inputs,
						outputs: item.outputs,
						score,
						...(item.builderHint?.message && { builderHintMessage: item.builderHint.message }),
						...(subnodeRequirements.length > 0 && { subnodeRequirements }),
					};
				},
			);
	}

	/**
	 * Search for sub-nodes that output a specific connection type
	 * Always return the latest version of a node
	 * @param connectionType - The connection type to search for
	 * @param limit - Maximum number of results
	 * @param nameFilter - Optional name filter
	 * @returns Array of matching sub-nodes
	 */
	searchByConnectionType(
		connectionType: NodeConnectionType,
		limit: number = 20,
		nameFilter?: string,
	): CodeBuilderNodeSearchResult[] {
		// First, filter by connection type
		const nodesWithConnectionType = this.nodeTypes
			.map((nodeType) => {
				const connectionScore = this.getConnectionScore(nodeType, connectionType);
				return connectionScore > 0 ? { nodeType, connectionScore } : null;
			})
			.filter((result): result is { nodeType: INodeTypeDescription; connectionScore: number } =>
				Boolean(result),
			);

		// If no name filter, return connection matches sorted by score
		if (!nameFilter) {
			return nodesWithConnectionType
				.sort((a, b) => b.connectionScore - a.connectionScore)
				.slice(0, limit)
				.map(({ nodeType, connectionScore }) => {
					const subnodeRequirements = extractSubnodeRequirements(nodeType.builderHint?.inputs);
					return {
						name: nodeType.name,
						displayName: nodeType.displayName,
						version: getLatestVersion(nodeType.version),
						description: nodeType.description ?? 'No description available',
						inputs: nodeType.inputs,
						outputs: nodeType.outputs,
						score: connectionScore,
						...(nodeType.builderHint?.message && {
							builderHintMessage: nodeType.builderHint.message,
						}),
						...(subnodeRequirements.length > 0 && { subnodeRequirements }),
					};
				});
		}

		// Apply name filter using sublimeSearch
		const nodeTypesOnly = nodesWithConnectionType.map((result) => result.nodeType);
		const nameFilteredResults = sublimeSearch(nameFilter, nodeTypesOnly, NODE_SEARCH_KEYS);

		// Combine connection score with name score
		return nameFilteredResults
			.slice(0, limit)
			.map(({ item, score: nameScore }: { item: INodeTypeDescription; score: number }) => {
				const connectionResult = nodesWithConnectionType.find(
					(result) => result.nodeType.name === item.name,
				);
				const connectionScore = connectionResult?.connectionScore ?? 0;
				const subnodeRequirements = extractSubnodeRequirements(item.builderHint?.inputs);

				return {
					name: item.name,
					version: getLatestVersion(item.version),
					displayName: item.displayName,
					description: item.description ?? 'No description available',
					inputs: item.inputs,
					outputs: item.outputs,
					score: connectionScore + nameScore,
					...(item.builderHint?.message && { builderHintMessage: item.builderHint.message }),
					...(subnodeRequirements.length > 0 && { subnodeRequirements }),
				};
			});
	}

	/**
	 * Format search results for tool output
	 * @param result - Single search result
	 * @returns XML-formatted string
	 */
	formatResult(result: CodeBuilderNodeSearchResult): string {
		const parts = [
			'		<node>',
			`			<node_name>${result.name}</node_name>`,
			`			<node_version>${result.version}</node_version>`,
			`			<node_description>${result.description}</node_description>`,
			`			<node_inputs>${typeof result.inputs === 'object' ? JSON.stringify(result.inputs) : result.inputs}</node_inputs>`,
			`			<node_outputs>${typeof result.outputs === 'object' ? JSON.stringify(result.outputs) : result.outputs}</node_outputs>`,
		];

		// Add builder hint message if present
		if (result.builderHintMessage) {
			parts.push(`			<builder_hint>${result.builderHintMessage}</builder_hint>`);
		}

		// Add subnode requirements if present
		if (result.subnodeRequirements && result.subnodeRequirements.length > 0) {
			parts.push('			<subnode_requirements>');
			for (const req of result.subnodeRequirements) {
				const requiredStr = req.required ? 'required' : 'optional';
				if (req.displayOptions) {
					parts.push(
						`				<requirement type="${req.connectionType}" status="${requiredStr}"><display_options>${JSON.stringify(req.displayOptions)}</display_options></requirement>`,
					);
				} else {
					parts.push(
						'				<requirement type="' +
							req.connectionType +
							'" status="' +
							requiredStr +
							'" />',
					);
				}
			}
			parts.push('			</subnode_requirements>');
		}

		parts.push('		</node>');

		return '\n' + parts.join('\n');
	}

	/**
	 * Get subnodes that output a specific connection type
	 * Uses default subnodes for common connection types
	 * @param connectionType - The connection type to find subnodes for
	 * @returns Array of node IDs that can satisfy this connection type
	 */
	getSubnodesForConnectionType(connectionType: string): string[] {
		// Return defaults for this connection type if available
		// ai_tool is excluded - it varies by use case
		return DEFAULT_SUBNODES[connectionType] ?? [];
	}

	/**
	 * Recursively collect related subnode IDs for nodes with builderHint.inputs
	 * For each connection type requirement, finds default subnodes and their transitive dependencies
	 * @param nodeIds - Initial node IDs to get related subnodes for
	 * @param excludeNodeIds - Node IDs to exclude (already shown in results)
	 * @returns Set of related node IDs
	 */
	getRelatedSubnodeIds(nodeIds: string[], excludeNodeIds: Set<string>): Set<string> {
		const allRelated = new Set<string>();
		const visited = new Set<string>(excludeNodeIds);

		// Mark initial nodes as visited
		for (const nodeId of nodeIds) {
			visited.add(nodeId);
		}

		// Process queue of nodes to check for subnode requirements
		const queue = [...nodeIds];

		while (queue.length > 0) {
			const currentNodeId = queue.shift()!;
			const nodeType = this.nodeTypes.find((n) => n.name === currentNodeId);
			if (!nodeType?.builderHint?.inputs) continue;

			// For each connection type in builderHint.inputs, get default subnodes
			for (const connectionType of Object.keys(nodeType.builderHint.inputs)) {
				const subnodeIds = this.getSubnodesForConnectionType(connectionType);

				for (const subnodeId of subnodeIds) {
					if (visited.has(subnodeId)) continue;

					visited.add(subnodeId);
					allRelated.add(subnodeId);

					// Add to queue for recursive processing
					queue.push(subnodeId);
				}
			}
		}

		return allRelated;
	}

	/**
	 * Get a node type by ID
	 * @param nodeId - The node ID to look up
	 * @returns The node type description or undefined
	 */
	getNodeType(nodeId: string): INodeTypeDescription | undefined {
		return this.nodeTypes.find((n) => n.name === nodeId);
	}

	/**
	 * Check if a node has a specific connection type in outputs
	 * @param nodeType - Node type to check
	 * @param connectionType - Connection type to look for
	 * @returns Score indicating match quality
	 */
	private getConnectionScore(
		nodeType: INodeTypeDescription,
		connectionType: NodeConnectionType,
	): number {
		const outputs = nodeType.outputs;

		if (Array.isArray(outputs)) {
			// Direct array match
			if (outputs.includes(connectionType)) {
				return SCORE_WEIGHTS.CONNECTION_EXACT;
			}
		} else if (typeof outputs === 'string') {
			// Expression string - check if it contains the connection type
			if (outputs.includes(connectionType)) {
				return SCORE_WEIGHTS.CONNECTION_IN_EXPRESSION;
			}
		}

		return 0;
	}

	/**
	 * Validate if a connection type is an AI connection type
	 * @param connectionType - Connection type to validate
	 * @returns True if it's an AI connection type
	 */
	static isAiConnectionType(connectionType: string): boolean {
		return connectionType.startsWith('ai_');
	}

	/**
	 * Get all available AI connection types
	 * @returns Array of AI connection types
	 */
	static getAiConnectionTypes(): NodeConnectionType[] {
		return Object.values(NodeConnectionTypes).filter(
			(type): type is NodeConnectionType =>
				isNodeConnectionType(type) && CodeBuilderNodeSearchEngine.isAiConnectionType(type),
		);
	}
}
