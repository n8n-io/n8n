/**
 * Node Search Engine
 *
 * Shared by the MCP server tool surface (via `NodeCatalogService`) and Instance
 * AI, which each carried a near-identical fork until they drifted in their
 * connection-type lists. A third, older fork still lives in
 * `ai-workflow-builder.ee` and is tracked separately.
 *
 * Callers hand over whatever node shape they already hold: a full
 * `INodeTypeDescription`, a pre-digested `LeanNodeTypeDescription`, or the
 * leaner `SearchableNodeType` an embedding host assembles. See
 * {@link SearchableNodeType}.
 */

import { sublimeSearch } from '@n8n/utils/search/sublime-search';
import type { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

import type { LeanNodeTypeDescription } from './lean-node-type';
import {
	AI_CONNECTION_TYPES,
	type AiConnectionType,
	type NodeSearchResult,
	type SearchableBuilderHintInputs,
	type SearchableNodeType,
	type SubnodeRequirement,
} from './types';

/**
 * Any node shape the engine accepts.
 *
 * All three are read directly, with no conversion step: the engine only reads
 * the fields in {@link SearchableNodeType}, which every one of them already
 * carries. It never reads a lean-only field such as `discriminatorsByVersion`,
 * so there is nothing to gain from narrowing an input to one specific shape
 * (and no way to do it reliably, since a host shape is free to carry extra
 * fields like `properties`).
 */
export type SearchEngineInput = INodeTypeDescription | LeanNodeTypeDescription | SearchableNodeType;

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

function extractSubnodeRequirements(inputs?: SearchableBuilderHintInputs): SubnodeRequirement[] {
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

function toNodeSearchResult(node: SearchableNodeType, score: number): NodeSearchResult {
	const subnodeRequirements = extractSubnodeRequirements(node.builderHint?.inputs);
	const builderHintMessage = node.builderHint?.searchHint;

	return {
		name: node.name,
		displayName: node.displayName,
		description: node.description ?? 'No description available',
		version: getLatestVersion(node.version),
		inputs: node.inputs,
		outputs: node.outputs,
		score,
		...(builderHintMessage && { builderHintMessage }),
		...(subnodeRequirements.length > 0 && { subnodeRequirements }),
		...(node.aiGateway && { aiGateway: node.aiGateway }),
	};
}

function dedupeNodes(nodes: SearchEngineInput[]): SearchableNodeType[] {
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

/**
 * Cap on cached queries per engine instance. An engine can outlive a great many
 * queries (`NodeCatalogService` holds one for the life of the process) and the
 * keys are model-authored query strings, so an uncapped map would grow without
 * bound. Evicting in insertion order is enough: the loser is recomputed on its
 * next use, which costs one search.
 */
const MAX_CACHED_QUERIES = 256;

function setCapped(cache: Map<string, NodeSearchResult[]>, key: string, value: NodeSearchResult[]) {
	if (cache.size >= MAX_CACHED_QUERIES) {
		const oldestKey = cache.keys().next().value;
		if (oldestKey !== undefined) cache.delete(oldestKey);
	}
	cache.set(key, value);
}

/**
 * Copy a cached result before handing it out, so that a caller adding fields to
 * what it got back cannot corrupt the cache for the next query. Callers do
 * exactly that: the Instance AI nodes tool attaches `discriminators` per result
 * and `suggestedNode` per requirement.
 *
 * The copy is deliberately one level deep per object: the result itself and its
 * requirement objects. Nested values (`inputs`, `outputs`, a requirement's
 * `displayOptions`) stay shared with the cached entry, because nothing on either
 * side writes to them, and deep-copying them would cost on every cache hit to
 * guard against a mutation no caller performs.
 */
function cloneSearchResult(result: NodeSearchResult): NodeSearchResult {
	return {
		...result,
		...(result.subnodeRequirements
			? {
					subnodeRequirements: result.subnodeRequirements.map((requirement) => ({
						...requirement,
					})),
				}
			: {}),
	};
}

function cloneSearchResults(results: NodeSearchResult[]): NodeSearchResult[] {
	return results.map(cloneSearchResult);
}

/**
 * Pure business logic for searching nodes
 * Separated from tool infrastructure for better testability.
 */
export class NodeSearchEngine {
	private readonly nodeTypes: SearchableNodeType[];

	private readonly nameSearchCache = new Map<string, NodeSearchResult[]>();

	private readonly connectionSearchCache = new Map<string, NodeSearchResult[]>();

	constructor(nodeTypes: SearchEngineInput[]) {
		this.nodeTypes = dedupeNodes(nodeTypes);
	}

	/**
	 * Fuzzy-search a list of nodes by query, handling multi-word queries by
	 * splitting into individual terms and merging results. Falls back to
	 * description keyword matching and direct type-name / display-name matching
	 * for nodes the fuzzy search missed.
	 *
	 * The per-term splitting exists because sublimeSearch matches the whole query
	 * as a single ordered character subsequence against one field, which fails
	 * natural-language queries like "telegram send message" or "ai agent
	 * langchain".
	 */
	private fuzzySearchNodes(
		query: string,
		candidates: SearchableNodeType[],
		limit?: number,
	): Array<{ item: SearchableNodeType; score: number }> {
		const queryLower = query.toLowerCase().trim();
		const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 1);
		const isMultiWord = queryTerms.length > 1;

		type ScoredNode = { item: SearchableNodeType; score: number };
		let searchResults: ScoredNode[];

		// For multi-word queries, search each term individually then merge.
		if (isMultiWord) {
			const scoreMap = new Map<string, ScoredNode>();
			for (const term of queryTerms) {
				const termResults = sublimeSearch<SearchableNodeType>(
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
			searchResults = sublimeSearch<SearchableNodeType>(query, candidates, NODE_SEARCH_KEYS);
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
	): NodeSearchResult[] {
		// A predicate can't be part of a cache key, so filtered searches skip the
		// cache rather than risk serving another filter's results.
		if (nodeFilter) {
			return this.fuzzySearchNodes(
				query,
				this.nodeTypes.filter((node) => nodeFilter(node.name)),
				limit,
			)
				.slice(0, limit)
				.map(({ item, score }) => toNodeSearchResult(item, score));
		}

		const cacheKey = `${query}\0${limit}`;
		const cached = this.nameSearchCache.get(cacheKey);
		if (cached) return cloneSearchResults(cached);

		const results = this.fuzzySearchNodes(query, this.nodeTypes, limit)
			.slice(0, limit)
			.map(({ item, score }) => toNodeSearchResult(item, score));
		setCapped(this.nameSearchCache, cacheKey, results);
		return cloneSearchResults(results);
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
		const cacheKey = `${connectionType}\0${limit}\0${nameFilter ?? ''}`;
		const cached = this.connectionSearchCache.get(cacheKey);
		if (cached) return cloneSearchResults(cached);

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
			const results = nodesWithConnectionType
				.sort((a, b) => b.connectionScore - a.connectionScore)
				.slice(0, limit)
				.map(({ nodeType, connectionScore }) => toNodeSearchResult(nodeType, connectionScore));
			setCapped(this.connectionSearchCache, cacheKey, results);
			return cloneSearchResults(results);
		}

		// Apply name filter using the same multi-word-aware fuzzy search as searchByName
		const nodeTypesOnly = nodesWithConnectionType.map((result) => result.nodeType);
		const nameFilteredResults = this.fuzzySearchNodes(nameFilter, nodeTypesOnly, limit);

		// Combine connection score with name score
		const results = nameFilteredResults.slice(0, limit).map(({ item, score: nameScore }) => {
			const connectionResult = nodesWithConnectionType.find(
				(result) => result.nodeType.name === item.name,
			);
			const connectionScore = connectionResult?.connectionScore ?? 0;
			return toNodeSearchResult(item, connectionScore + nameScore);
		});
		setCapped(this.connectionSearchCache, cacheKey, results);
		return cloneSearchResults(results);
	}

	/**
	 * Format search results for tool output
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

		// Flag n8n Connect coverage so the model can prefer it over comparable
		// alternatives when the user has not named a specific tool.
		if (result.aiGateway) {
			const minVersion =
				result.aiGateway.minVersion !== undefined
					? ` min_version="${result.aiGateway.minVersion}"`
					: '';
			parts.push(`			<n8n_credits supported="true"${minVersion} />`);
		}

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
	getNodeType(nodeId: string): SearchableNodeType | undefined {
		return this.nodeTypes.find((n) => n.name === nodeId);
	}

	/**
	 * Check if a node has a specific connection type in outputs
	 * @param nodeType - Node type to check
	 * @param connectionType - Connection type to look for
	 * @returns Score indicating match quality
	 */
	private getConnectionScore(
		nodeType: SearchableNodeType,
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
	static getAiConnectionTypes(): readonly AiConnectionType[] {
		return AI_CONNECTION_TYPES;
	}
}
