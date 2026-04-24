/**
 * Node Search Engine
 *
 * Ported from ai-workflow-builder.ee/code-builder/engines/code-builder-node-search-engine.ts
 * into the instance-ai package.  All n8n-workflow dependencies have been
 * replaced with local types so the package stays decoupled.
 */

import { sublimeSearch } from '@n8n/utils';

import type {
	BuilderHintInputs,
	NodeSearchResult,
	SearchableNodeType,
	SubnodeRequirement,
} from './node-search-engine.types';
import { AI_CONNECTION_TYPES } from './node-search-engine.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Default subnodes for each connection type.
 * These are sensible defaults shown in search results.
 */
const DEFAULT_SUBNODES: Record<string, string[]> = {
	ai_languageModel: ['@n8n/n8n-nodes-langchain.lmChatOpenAi'],
	ai_memory: ['@n8n/n8n-nodes-langchain.memoryBufferWindow'],
	ai_embedding: ['@n8n/n8n-nodes-langchain.embeddingsOpenAi'],
	ai_vectorStore: ['@n8n/n8n-nodes-langchain.vectorStoreInMemory'],
	// ai_tool is intentionally excluded - varies by use case
};

/**
 * Search keys configuration for sublimeSearch.
 * Keys are ordered by importance with corresponding weights.
 */
const NODE_SEARCH_KEYS = [
	{ key: 'displayName', weight: 1.5 },
	{ key: 'name', weight: 1.3 },
	{ key: 'codex.alias', weight: 1.0 },
	{ key: 'description', weight: 0.7 },
];

/**
 * Extract the short type name from a full node name.
 * e.g., "n8n-nodes-base.set" -> "set"
 */
function getTypeName(nodeName: string): string {
	if (!nodeName) return '';
	const lastDotIndex = nodeName.lastIndexOf('.');
	return lastDotIndex >= 0 ? nodeName.substring(lastDotIndex + 1) : nodeName;
}

/** Scoring weights for connection type matching. */
export const SCORE_WEIGHTS = {
	CONNECTION_EXACT: 100,
	CONNECTION_IN_EXPRESSION: 50,
} as const;

function getLatestVersion(version: number | number[]): number {
	return Array.isArray(version) ? Math.max(...version) : version;
}

/** Extract subnode requirements from builderHint.inputs. */
function extractSubnodeRequirements(inputs?: BuilderHintInputs): SubnodeRequirement[] {
	if (!inputs) return [];

	return Object.entries(inputs)
		.filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null)
		.map(([connectionType, config]) => ({
			connectionType,
			required: config.required,
			...(config.displayOptions && { displayOptions: config.displayOptions }),
		}));
}

function dedupeNodes(nodes: SearchableNodeType[]): SearchableNodeType[] {
	const dedupeCache: Record<string, SearchableNodeType> = {};
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

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Pure business logic for searching nodes.
 * Separated from tool infrastructure for better testability.
 */
export class NodeSearchEngine {
	private readonly nodeTypes: SearchableNodeType[];

	constructor(nodeTypes: SearchableNodeType[]) {
		this.nodeTypes = dedupeNodes(nodeTypes);
	}

	/**
	 * Fuzzy-search a list of nodes by query, handling multi-word queries by
	 * splitting into individual terms and merging results. Falls back to
	 * direct type-name / display-name matching for nodes the fuzzy search missed.
	 */
	private fuzzySearchNodes(
		query: string,
		candidates: SearchableNodeType[],
	): Array<{ item: SearchableNodeType; score: number }> {
		const queryLower = query.toLowerCase().trim();
		const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 1);
		const isMultiWord = queryTerms.length > 1;

		// For multi-word queries, search each term individually then merge.
		// sublimeSearch breaks down on multi-word queries because it tries to
		// fuzzy-match the entire string as one character sequence.
		type ScoredNode = { item: SearchableNodeType; score: number };
		let searchResults: ScoredNode[];

		if (isMultiWord) {
			const scoreMap = new Map<string, ScoredNode>();
			for (const term of queryTerms) {
				const termResults = sublimeSearch<SearchableNodeType>(term, candidates, NODE_SEARCH_KEYS);
				for (const r of termResults) {
					const existing = scoreMap.get(r.item.name);
					if (!existing || r.score > existing.score) {
						scoreMap.set(r.item.name, { item: r.item, score: r.score });
					}
				}
			}
			searchResults = [...scoreMap.values()];
		} else {
			searchResults = sublimeSearch<SearchableNodeType>(query, candidates, NODE_SEARCH_KEYS);
		}

		const fuzzyResultNames = new Set(searchResults.map((r) => r.item.name));

		// Direct type name / display name match — catches nodes fuzzy search missed
		const typeNameMatches = candidates
			.filter((node) => {
				if (fuzzyResultNames.has(node.name)) return false;
				const typeName = getTypeName(node.name).toLowerCase();
				const displayName = node.displayName.toLowerCase();
				if (typeName === queryLower || displayName === queryLower) return true;
				return queryTerms.some(
					(term) =>
						typeName === term ||
						typeName.includes(term) ||
						displayName === term ||
						displayName.includes(term),
				);
			})
			.map((item) => ({ item, score: 0 }));

		// Merge and sort: exact type/display name matches first, then by fuzzy score
		const allResults = [...searchResults, ...typeNameMatches];
		allResults.sort((a, b) => {
			const typeNameA = getTypeName(a.item.name).toLowerCase();
			const displayNameA = a.item.displayName.toLowerCase();
			const typeNameB = getTypeName(b.item.name).toLowerCase();
			const displayNameB = b.item.displayName.toLowerCase();
			const exactA =
				typeNameA === queryLower ||
				displayNameA === queryLower ||
				queryTerms.some((t) => typeNameA === t || displayNameA === t);
			const exactB =
				typeNameB === queryLower ||
				displayNameB === queryLower ||
				queryTerms.some((t) => typeNameB === t || displayNameB === t);
			if (exactA && !exactB) return -1;
			if (!exactA && exactB) return 1;
			return b.score - a.score;
		});

		return allResults;
	}

	/**
	 * Search nodes by name, display name, or description.
	 * Always returns the latest version of a node.
	 * @param query - The search query string
	 * @param limit - Maximum number of results to return
	 * @returns Array of matching nodes sorted by relevance
	 */
	searchByName(query: string, limit: number = 20): NodeSearchResult[] {
		return this.fuzzySearchNodes(query, this.nodeTypes)
			.slice(0, limit)
			.map(({ item, score }): NodeSearchResult => {
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
			});
	}

	/**
	 * Search for sub-nodes that output a specific connection type.
	 * Always returns the latest version of a node.
	 * @param connectionType - The connection type to search for
	 * @param limit - Maximum number of results
	 * @param nameFilter - Optional name filter
	 * @returns Array of matching sub-nodes
	 */
	searchByConnectionType(
		connectionType: string,
		limit: number = 20,
		nameFilter?: string,
	): NodeSearchResult[] {
		// First, filter by connection type
		const nodesWithConnectionType = this.nodeTypes
			.map((nodeType) => {
				const connectionScore = this.getConnectionScore(nodeType, connectionType);
				return connectionScore > 0 ? { nodeType, connectionScore } : null;
			})
			.filter((result): result is { nodeType: SearchableNodeType; connectionScore: number } =>
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

		// Apply name filter using the same multi-word-aware fuzzy search as searchByName
		const nodeTypesOnly = nodesWithConnectionType.map((result) => result.nodeType);
		const nameFilteredResults = this.fuzzySearchNodes(nameFilter, nodeTypesOnly);

		// Combine connection score with name score
		return nameFilteredResults.slice(0, limit).map(({ item, score: nameScore }) => {
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
	 * Format search results for tool output.
	 * @param result - Single search result
	 * @returns XML-formatted string
	 */
	formatResult(result: NodeSearchResult): string {
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
	 * Get subnodes that output a specific connection type.
	 * Uses default subnodes for common connection types.
	 * @param connectionType - The connection type to find subnodes for
	 * @returns Array of node IDs that can satisfy this connection type
	 */
	getSubnodesForConnectionType(connectionType: string): string[] {
		// Return defaults for this connection type if available
		// ai_tool is excluded - it varies by use case
		return DEFAULT_SUBNODES[connectionType] ?? [];
	}

	/**
	 * Recursively collect related subnode IDs for nodes with builderHint.inputs.
	 * For each connection type requirement, finds default subnodes and their
	 * transitive dependencies.
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
	 * Get a node type by ID.
	 * @param nodeId - The node ID to look up
	 * @returns The node type description or undefined
	 */
	getNodeType(nodeId: string): SearchableNodeType | undefined {
		return this.nodeTypes.find((n) => n.name === nodeId);
	}

	/**
	 * Check if a node has a specific connection type in outputs.
	 * @param nodeType - Node type to check
	 * @param connectionType - Connection type to look for
	 * @returns Score indicating match quality
	 */
	private getConnectionScore(nodeType: SearchableNodeType, connectionType: string): number {
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
	 * Validate if a connection type is an AI connection type.
	 * @param connectionType - Connection type to validate
	 * @returns True if it's an AI connection type
	 */
	static isAiConnectionType(connectionType: string): boolean {
		return connectionType.startsWith('ai_');
	}

	/**
	 * Get all available AI connection types.
	 * @returns Array of AI connection type strings
	 */
	static getAiConnectionTypes(): readonly string[] {
		return AI_CONNECTION_TYPES;
	}
}
