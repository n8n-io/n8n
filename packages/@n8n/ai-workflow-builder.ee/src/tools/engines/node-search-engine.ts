import { sublimeSearch } from '@n8n/utils';
import type { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { NodeSearchResult } from '../../types/nodes';

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
 * Scoring weights for connection type matching
 */
export const SCORE_WEIGHTS = {
	CONNECTION_EXACT: 100,
	CONNECTION_IN_EXPRESSION: 50,
} as const;

function getLatestVersion(version: number | number[]): number {
	return Array.isArray(version) ? Math.max(...version) : version;
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
export class NodeSearchEngine {
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
	searchByName(query: string, limit: number = 20): NodeSearchResult[] {
		// Use sublimeSearch for fuzzy matching
		const searchResults = sublimeSearch<INodeTypeDescription>(
			query,
			this.nodeTypes,
			NODE_SEARCH_KEYS,
		);

		// Map results to NodeSearchResult format and apply limit
		return searchResults.slice(0, limit).map(
			({ item, score }: { item: INodeTypeDescription; score: number }): NodeSearchResult => ({
				name: item.name,
				displayName: item.displayName,
				description: item.description ?? 'No description available',
				version: getLatestVersion(item.version),
				inputs: item.inputs,
				outputs: item.outputs,
				score,
			}),
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
	): NodeSearchResult[] {
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
				.map(({ nodeType, connectionScore }) => ({
					name: nodeType.name,
					displayName: nodeType.displayName,
					version: getLatestVersion(nodeType.version),
					description: nodeType.description ?? 'No description available',
					inputs: nodeType.inputs,
					outputs: nodeType.outputs,
					score: connectionScore,
				}));
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

				return {
					name: item.name,
					version: getLatestVersion(item.version),
					displayName: item.displayName,
					description: item.description ?? 'No description available',
					inputs: item.inputs,
					outputs: item.outputs,
					score: connectionScore + nameScore,
				};
			});
	}

	/**
	 * Format search results for tool output
	 * @param result - Single search result
	 * @returns XML-formatted string
	 */
	formatResult(result: NodeSearchResult): string {
		return `
		<node>
			<node_name>${result.name}</node_name>
			<node_version>${result.version}</node_version>
			<node_description>${result.description}</node_description>
			<node_inputs>${typeof result.inputs === 'object' ? JSON.stringify(result.inputs) : result.inputs}</node_inputs>
			<node_outputs>${typeof result.outputs === 'object' ? JSON.stringify(result.outputs) : result.outputs}</node_outputs>
		</node>`;
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
		return Object.values(NodeConnectionTypes).filter((type) =>
			NodeSearchEngine.isAiConnectionType(type),
		) as NodeConnectionType[];
	}
}
