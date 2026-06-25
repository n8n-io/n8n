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

import { toLeanNodeType, type LeanNodeTypeDescription } from './lean-node-type';
import type { CodeBuilderNodeSearchResult, SubnodeRequirement } from './types';

/** Detect already-lean inputs by their marker field so we can skip re-conversion. */
function isLeanNodeType(
	node: INodeTypeDescription | LeanNodeTypeDescription,
): node is LeanNodeTypeDescription {
	return 'discriminatorsByVersion' in node;
}

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
 * Search keys for sublimeSearch.
 *
 * `description` is intentionally excluded: with the per-word splitting in
 * `fuzzySearchNodes`, fuzzy-matching short terms against long descriptions is too
 * noisy (the `descriptionMatchScore` substring fallback covers it instead).
 */
const NODE_SEARCH_KEYS = [
	{ key: 'displayName', weight: 1.5 },
	{ key: 'name', weight: 1.3 },
	{ key: 'codex.alias', weight: 1.0 },
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
 * Count how many query terms appear as substrings of a node's description.
 * Used as a fallback for nodes the fuzzy/name passes miss, since `description`
 * is no longer a sublimeSearch key (see {@link NODE_SEARCH_KEYS}).
 */
function descriptionMatchScore(
	description: string | undefined,
	queryLower: string,
	queryTerms: string[],
): number {
	if (!description) return 0;
	const descriptionLower = description.toLowerCase();
	if (queryTerms.length === 0) return descriptionLower.includes(queryLower) ? 1 : 0;
	let matches = 0;
	for (const term of queryTerms) {
		if (descriptionLower.includes(term)) matches += 1;
	}
	return matches;
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

function extractSubnodeRequirements(inputs?: BuilderHintInputs): SubnodeRequirement[] {
	if (!inputs) return [];

	return Object.entries(inputs)
		.filter(
			(entry): entry is [string, NonNullable<(typeof entry)[1]>] =>
				entry[1] !== null && entry[1] !== undefined,
		)
		.map(([connectionType, config]) => ({
			connectionType,
			required: config.required,
			...(config.displayOptions && { displayOptions: config.displayOptions }),
		}));
}

function dedupeNodes(nodes: LeanNodeTypeDescription[]): LeanNodeTypeDescription[] {
	const dedupeCache: Record<string, LeanNodeTypeDescription> = {};
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
 * Separated from tool infrastructure for better testability.
 *
 * Accepts either full `INodeTypeDescription[]` or already-converted
 * `LeanNodeTypeDescription[]` — production callers pass lean to avoid the
 * conversion cost, tests typically pass full descriptions and the engine
 * converts on the way in.
 */
export class CodeBuilderNodeSearchEngine {
	private readonly nodeTypes: LeanNodeTypeDescription[];
	constructor(nodeTypes: Array<INodeTypeDescription | LeanNodeTypeDescription>) {
		const lean = nodeTypes.map((n) => (isLeanNodeType(n) ? n : toLeanNodeType(n)));
		this.nodeTypes = dedupeNodes(lean);
	}

	/**
	 * Fuzzy-search a list of nodes by query, handling multi-word queries by
	 * splitting into individual terms and merging results. Falls back to
	 * description keyword matching and direct type-name / display-name matching
	 * for nodes the fuzzy search missed.
	 *
	 * Ported from the Instance AI `NodeSearchEngine` so code-builder / MCP node
	 * search resolves natural-language multi-word queries (e.g. "telegram send
	 * message", "ai agent langchain") instead of returning no results — these
	 * previously failed because sublimeSearch matched the whole query string as a
	 * single ordered character subsequence against one field.
	 */
	private fuzzySearchNodes(
		query: string,
		candidates: LeanNodeTypeDescription[],
		limit?: number,
	): Array<{ item: LeanNodeTypeDescription; score: number }> {
		const queryLower = query.toLowerCase().trim();
		const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 1);
		const isMultiWord = queryTerms.length > 1;

		type ScoredNode = { item: LeanNodeTypeDescription; score: number };
		let searchResults: ScoredNode[];

		// For multi-word queries, search each term individually then merge.
		// sublimeSearch breaks down on multi-word queries because it tries to
		// fuzzy-match the entire string as one character sequence.
		if (isMultiWord) {
			const scoreMap = new Map<string, ScoredNode>();
			for (const term of queryTerms) {
				const termResults = sublimeSearch<LeanNodeTypeDescription>(
					term,
					candidates,
					NODE_SEARCH_KEYS,
				).slice(0, limit);
				for (const r of termResults) {
					const existing = scoreMap.get(r.item.name);
					if (!existing || r.score > existing.score) {
						scoreMap.set(r.item.name, { item: r.item, score: r.score });
					}
				}
			}
			searchResults = [...scoreMap.values()];
		} else {
			searchResults = sublimeSearch<LeanNodeTypeDescription>(query, candidates, NODE_SEARCH_KEYS);
		}

		const fuzzyResultNames = new Set(searchResults.map((r) => r.item.name));

		// Description keyword fallback for nodes the fuzzy pass missed
		const remainingDescriptionMatches =
			limit === undefined ? Number.POSITIVE_INFINITY : Math.max(0, limit - searchResults.length);
		if (remainingDescriptionMatches > 0) {
			const descriptionResults: ScoredNode[] = [];
			for (const item of candidates) {
				if (fuzzyResultNames.has(item.name)) continue;
				const score = descriptionMatchScore(item.description, queryLower, queryTerms);
				if (score === 0) continue;
				descriptionResults.push({ item, score });
				fuzzyResultNames.add(item.name);
				if (descriptionResults.length >= remainingDescriptionMatches) break;
			}
			searchResults = [...searchResults, ...descriptionResults];
		}

		// Direct type name / display name match — catches nodes fuzzy search missed.
		// `displayName` is guarded against undefined to tolerate malformed node types.
		const typeNameMatches = candidates
			.filter((node) => {
				if (fuzzyResultNames.has(node.name)) return false;
				const typeName = getTypeName(node.name).toLowerCase();
				const displayName = (node.displayName ?? '').toLowerCase();
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
			const displayNameA = (a.item.displayName ?? '').toLowerCase();
			const typeNameB = getTypeName(b.item.name).toLowerCase();
			const displayNameB = (b.item.displayName ?? '').toLowerCase();
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
	 * Search nodes by name, display name, alias, or description.
	 * Always return the latest version of a node.
	 * @param query - The search query string
	 * @param limit - Maximum number of results to return
	 * @param nodeFilter - Optional predicate restricting which node IDs are searched
	 * @returns Array of matching nodes sorted by relevance
	 */
	searchByName(
		query: string,
		limit: number = 20,
		nodeFilter?: (nodeId: string) => boolean,
	): CodeBuilderNodeSearchResult[] {
		const nodeTypes = nodeFilter
			? this.nodeTypes.filter((node) => nodeFilter(node.name))
			: this.nodeTypes;

		return this.fuzzySearchNodes(query, nodeTypes, limit)
			.slice(0, limit)
			.map(
				({
					item,
					score,
				}: { item: LeanNodeTypeDescription; score: number }): CodeBuilderNodeSearchResult => {
					const subnodeRequirements = extractSubnodeRequirements(item.builderHint?.inputs);
					return {
						name: item.name,
						displayName: item.displayName,
						description: item.description ?? 'No description available',
						version: getLatestVersion(item.version),
						inputs: item.inputs,
						outputs: item.outputs,
						score,
						...(item.builderHint?.searchHint && {
							builderHintMessage: item.builderHint.searchHint,
						}),
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
			.filter((result): result is { nodeType: LeanNodeTypeDescription; connectionScore: number } =>
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
						...(nodeType.builderHint?.searchHint && {
							builderHintMessage: nodeType.builderHint.searchHint,
						}),
						...(subnodeRequirements.length > 0 && { subnodeRequirements }),
					};
				});
		}

		// Apply name filter using the same multi-word-aware fuzzy search as searchByName
		const nodeTypesOnly = nodesWithConnectionType.map((result) => result.nodeType);
		const nameFilteredResults = this.fuzzySearchNodes(nameFilter, nodeTypesOnly, limit);

		// Combine connection score with name score
		return nameFilteredResults
			.slice(0, limit)
			.map(({ item, score: nameScore }: { item: LeanNodeTypeDescription; score: number }) => {
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
					...(item.builderHint?.searchHint && {
						builderHintMessage: item.builderHint.searchHint,
					}),
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
	getNodeType(nodeId: string): LeanNodeTypeDescription | undefined {
		return this.nodeTypes.find((n) => n.name === nodeId);
	}

	/**
	 * Check if a node has a specific connection type in outputs
	 * @param nodeType - Node type to check
	 * @param connectionType - Connection type to look for
	 * @returns Score indicating match quality
	 */
	private getConnectionScore(
		nodeType: LeanNodeTypeDescription,
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
