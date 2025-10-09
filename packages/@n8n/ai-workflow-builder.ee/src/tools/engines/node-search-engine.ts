import type { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { NodeSearchResult } from '../../types/nodes';

/**
 * Scoring weights for different match types
 */
export const SCORE_WEIGHTS = {
	NAME_CONTAINS: 10,
	DISPLAY_NAME_CONTAINS: 8,
	DESCRIPTION_CONTAINS: 5,
	ALIAS_CONTAINS: 8,
	NAME_EXACT: 20,
	DISPLAY_NAME_EXACT: 15,
	CONNECTION_EXACT: 100,
	CONNECTION_IN_EXPRESSION: 50,
} as const;

/**
 * Pure business logic for searching nodes
 * Separated from tool infrastructure for better testability
 */
export class NodeSearchEngine {
	constructor(private readonly nodeTypes: INodeTypeDescription[]) {}

	/**
	 * Search nodes by name, display name, or description
	 * @param query - The search query string
	 * @param limit - Maximum number of results to return
	 * @returns Array of matching nodes sorted by relevance
	 */
	searchByName(query: string, limit: number = 20): NodeSearchResult[] {
		const normalizedQuery = query.toLowerCase();
		const results: NodeSearchResult[] = [];

		for (const nodeType of this.nodeTypes) {
			try {
				const score = this.calculateNameScore(nodeType, normalizedQuery);
				if (score > 0) {
					results.push(this.createSearchResult(nodeType, score));
				}
			} catch (error) {
				// Ignore errors for now
			}
		}

		return this.sortAndLimit(results, limit);
	}

	/**
	 * Search for sub-nodes that output a specific connection type
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
		const results: NodeSearchResult[] = [];
		const normalizedFilter = nameFilter?.toLowerCase();

		for (const nodeType of this.nodeTypes) {
			try {
				const connectionScore = this.getConnectionScore(nodeType, connectionType);
				if (connectionScore > 0) {
					// Apply name filter if provided
					const nameScore = normalizedFilter
						? this.calculateNameScore(nodeType, normalizedFilter)
						: 0;

					if (!normalizedFilter || nameScore > 0) {
						const totalScore = connectionScore + nameScore;
						results.push(this.createSearchResult(nodeType, totalScore));
					}
				}
			} catch (error) {
				// Ignore errors for now
			}
		}

		return this.sortAndLimit(results, limit);
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
			<node_description>${result.description}</node_description>
			<node_inputs>${typeof result.inputs === 'object' ? JSON.stringify(result.inputs) : result.inputs}</node_inputs>
			<node_outputs>${typeof result.outputs === 'object' ? JSON.stringify(result.outputs) : result.outputs}</node_outputs>
		</node>`;
	}

	/**
	 * Calculate score based on name matches
	 * @param nodeType - Node type to score
	 * @param normalizedQuery - Lowercase search query
	 * @returns Numeric score
	 */
	private calculateNameScore(nodeType: INodeTypeDescription, normalizedQuery: string): number {
		let score = 0;

		// Check name match
		if (nodeType.name.toLowerCase().includes(normalizedQuery)) {
			score += SCORE_WEIGHTS.NAME_CONTAINS;
		}

		// Check display name match
		if (nodeType.displayName.toLowerCase().includes(normalizedQuery)) {
			score += SCORE_WEIGHTS.DISPLAY_NAME_CONTAINS;
		}

		// Check description match
		if (nodeType.description?.toLowerCase().includes(normalizedQuery)) {
			score += SCORE_WEIGHTS.DESCRIPTION_CONTAINS;
		}

		// Check alias match
		if (nodeType.codex?.alias?.some((alias) => alias.toLowerCase().includes(normalizedQuery))) {
			score += SCORE_WEIGHTS.ALIAS_CONTAINS;
		}

		// Check exact matches (boost score)
		if (nodeType.name.toLowerCase() === normalizedQuery) {
			score += SCORE_WEIGHTS.NAME_EXACT;
		}
		if (nodeType.displayName.toLowerCase() === normalizedQuery) {
			score += SCORE_WEIGHTS.DISPLAY_NAME_EXACT;
		}

		return score;
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
	 * Create a search result object
	 * @param nodeType - Node type description
	 * @param score - Calculated score
	 * @returns Search result object
	 */
	private createSearchResult(nodeType: INodeTypeDescription, score: number): NodeSearchResult {
		return {
			name: nodeType.name,
			displayName: nodeType.displayName,
			description: nodeType.description ?? 'No description available',
			inputs: nodeType.inputs,
			outputs: nodeType.outputs,
			score,
		};
	}

	/**
	 * Sort and limit search results
	 * @param results - Array of results
	 * @param limit - Maximum number to return
	 * @returns Sorted and limited results
	 */
	private sortAndLimit(results: NodeSearchResult[], limit: number): NodeSearchResult[] {
		return results.sort((a, b) => b.score - a.score).slice(0, limit);
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
