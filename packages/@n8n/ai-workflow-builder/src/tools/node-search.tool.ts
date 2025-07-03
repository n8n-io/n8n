import { ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { Command } from '@langchain/langgraph';
import { NodeConnectionTypes, type INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { z } from 'zod';

export interface NodeSearchResult {
	name: string;
	displayName: string;
	description: string;
	score: number;
	inputs: INodeTypeDescription['inputs'];
	outputs: INodeTypeDescription['outputs'];
}

const searchQuerySchema = z
	.object({
		query: z
			.string()
			.optional()
			.describe(
				'Search term to filter results by name/description. Required for "name" search, optional for "subNodeSearch"',
			),
		queryType: z
			.enum(['name', 'subNodeSearch'])
			.optional()
			.default('name')
			.describe('Type of search to perform'),
		connectionType: z
			.nativeEnum(NodeConnectionTypes)
			.optional()
			.describe(
				'Connection type to search for (e.g., NodeConnectionTypes.AiLanguageModel) - required when queryType is "subNodeSearch"',
			),
		// limit: z.number().optional().default(20).describe('Maximum number of results per query (default: 20)'),
	})
	.refine(
		(data) => {
			if (data.queryType === 'name') {
				return !!data.query;
			} else {
				return !!data.connectionType && data.connectionType.startsWith('ai_');
			}
		},
		{
			message:
				'For name queries, "query" is required. For subNodeSearch queries, "connectionType" starting with "ai_" is required.',
		},
	);

const nodeSearchSchema = z.object({
	queries: z
		.array(searchQuerySchema)
		.describe('Array of search queries to find different types of nodes'),
});

const SEARCH_LIMIT = 15;
/**
 * Formats a NodeSearchResult into an XML-like string for tool output
 * @param node - The search result to format
 * @returns Formatted string representation of the node
 */
const nodeMapper = (node: NodeSearchResult) => {
	return `
		<node>
			<node_name>${node.name}</node_name>
			<node_description>${node.description}</node_description>
			<node_inputs>${node.inputs}</node_inputs>
			<node_outputs>${node.outputs}</node_outputs>
			<node_display_name>${node.displayName}</node_display_name>
			<node_score>${node.score}</node_score>
		</node>
	`;
};

/**
 * Creates a LangGraph tool for searching n8n nodes
 * @param nodeTypes - Array of all available node type descriptions
 * @returns A tool that can search nodes by name or by their output connection types
 */
export const createNodeSearchTool = (nodeTypes: INodeTypeDescription[]) => {
	return tool(
		async (input, config) => {
			const { queries } = input;
			const allResults: { query: string; results: NodeSearchResult[] }[] = [];

			// Process each query
			for (const searchQuery of queries) {
				const { query, queryType = 'name', connectionType } = searchQuery;

				let searchResults: NodeSearchResult[] = [];
				let searchIdentifier = '';

				if (queryType === 'name' && query) {
					searchResults = searchNodes(query, SEARCH_LIMIT, nodeTypes);
					searchIdentifier = query;
				} else if (queryType === 'subNodeSearch' && connectionType) {
					searchResults = searchNodesByConnection(
						connectionType,
						'outputs',
						SEARCH_LIMIT,
						nodeTypes,
						query,
					);
					searchIdentifier = query
						? `sub-nodes with ${connectionType} output matching "${query}"`
						: `sub-nodes with ${connectionType} output`;
				}

				allResults.push({ query: searchIdentifier, results: searchResults });
			}

			// Build response message
			let responseContent = '';
			for (const { query, results } of allResults) {
				if (responseContent) responseContent += '\n\n';

				if (results.length === 0) {
					responseContent += `No nodes found matching "${query}"`;
				} else {
					responseContent += `Found ${results.length} nodes matching "${query}":${results.map(nodeMapper).join('')}`;
				}
			}

			return new Command({
				update: {
					messages: [
						new ToolMessage({
							content: responseContent,
							tool_call_id: config.toolCall?.id,
						}),
					],
				},
			});
		},
		{
			name: 'search_nodes',
			description: `Search for n8n nodes by name or find sub-nodes that output specific connection types. Use this before adding nodes to find the correct node types.

Search modes:
1. Name search (default): Search nodes by name/description
   Example: { queryType: "name", query: "http" }

2. Sub-node search: Find sub-nodes that output specific AI connection types
   Example: { queryType: "subNodeSearch", connectionType: NodeConnectionTypes.AiTool }
   With optional query filter: { queryType: "subNodeSearch", connectionType: NodeConnectionTypes.AiTool, query: "calculator" }
   This finds sub-nodes (like "Calculator Tool") that can be connected to nodes accepting that connection type

Common AI connection types for sub-node search:
- NodeConnectionTypes.AiLanguageModel (finds LLM provider sub-nodes like "OpenAI Chat Model")
- NodeConnectionTypes.AiTool (finds tool sub-nodes like "Calculator Tool", "Code Tool")
- NodeConnectionTypes.AiMemory (finds memory sub-nodes like "Window Buffer Memory")
- NodeConnectionTypes.AiEmbedding (finds embedding sub-nodes like "Embeddings OpenAI")
- NodeConnectionTypes.AiVectorStore (finds vector store sub-nodes)
- NodeConnectionTypes.AiDocument (finds document loader sub-nodes)
- NodeConnectionTypes.AiTextSplitter (finds text splitter sub-nodes)

You can search for multiple different criteria at once by providing an array of queries.`,
			schema: nodeSearchSchema,
		},
	);
};

// Scoring weights for different match types
const SCORE_WEIGHTS = {
	NAME_CONTAINS: 10,
	DISPLAY_NAME_CONTAINS: 8,
	DESCRIPTION_CONTAINS: 5,
	NAME_EXACT: 20,
	DISPLAY_NAME_EXACT: 15,
	CONNECTION_EXACT: 100,
	CONNECTION_IN_EXPRESSION: 50,
};

/**
 * Calculates a score based on how well a node matches a search query
 * @param nodeType - The node type to score
 * @param normalizedQuery - The lowercase search query
 * @returns A numeric score (higher is better match)
 */
function calculateNameScore(nodeType: INodeTypeDescription, normalizedQuery: string): number {
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
 * Creates a standardized NodeSearchResult object from a node type
 * @param nodeType - The node type description
 * @param score - The calculated relevance score
 * @returns A NodeSearchResult object
 */
function createNodeSearchResult(nodeType: INodeTypeDescription, score: number): NodeSearchResult {
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
 * Sorts search results by score (descending) and limits the number of results
 * @param results - Array of search results to process
 * @param limit - Maximum number of results to return
 * @returns Sorted and limited array of results
 */
function sortAndLimitResults(results: NodeSearchResult[], limit: number): NodeSearchResult[] {
	return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Searches for nodes by name, display name, or description
 * @param query - The search query string
 * @param limit - Maximum number of results to return (default: 20)
 * @param nodeTypes - Array of all available node types to search through
 * @returns Array of matching nodes sorted by relevance
 */
function searchNodes(
	query: string,
	limit: number = 20,
	nodeTypes: INodeTypeDescription[],
): NodeSearchResult[] {
	const normalizedQuery = query.toLowerCase();
	const results: NodeSearchResult[] = [];

	for (const nodeType of nodeTypes) {
		try {
			const score = calculateNameScore(nodeType, normalizedQuery);

			if (score > 0) {
				results.push(createNodeSearchResult(nodeType, score));
			}
		} catch (error) {
			console.error(
				`Error processing node type "${nodeType.name}":`,
				error,
				JSON.stringify(nodeType, null, 2),
			);
		}
	}

	return sortAndLimitResults(results, limit);
}

/**
 * Checks if a node has a specific connection type in its outputs
 * @param nodeType - The node type to check
 * @param connectionType - The connection type to look for (e.g., NodeConnectionTypes.AiLanguageModel)
 * @param field - The field to check (currently only 'outputs' is supported)
 * @returns Score indicating match quality (100 for exact match, 50 for expression match, 0 for no match)
 */
function getConnectionScore(
	nodeType: INodeTypeDescription,
	connectionType: NodeConnectionType,
	field: 'outputs',
): number {
	const fieldValue = nodeType[field];

	if (Array.isArray(fieldValue)) {
		// Direct array match
		if (fieldValue.includes(connectionType)) {
			return SCORE_WEIGHTS.CONNECTION_EXACT;
		}
	} else if (typeof fieldValue === 'string') {
		// Expression string - check if it contains the connection type
		if (fieldValue.includes(connectionType)) {
			return SCORE_WEIGHTS.CONNECTION_IN_EXPRESSION;
		}
	}

	return 0;
}

/**
 * Searches for sub-nodes that output a specific connection type
 * @param connectionType - The AI connection type to search for (e.g., NodeConnectionTypes.AiLanguageModel)
 * @param field - The field to search in (currently only 'outputs' is supported)
 * @param limit - Maximum number of results to return
 * @param nodeTypes - Array of all available node types to search through
 * @param query - Optional search query to further filter results by name/description
 * @returns Array of matching sub-nodes sorted by relevance
 */
function searchNodesByConnection(
	connectionType: NodeConnectionType,
	field: 'outputs',
	limit: number,
	nodeTypes: INodeTypeDescription[],
	query?: string,
): NodeSearchResult[] {
	const results: NodeSearchResult[] = [];
	const normalizedQuery = query?.toLowerCase();

	for (const nodeType of nodeTypes) {
		try {
			const connectionScore = getConnectionScore(nodeType, connectionType, field);

			if (connectionScore > 0) {
				// Calculate name score if query is provided
				const nameScore = normalizedQuery ? calculateNameScore(nodeType, normalizedQuery) : 0;

				// Include node if no query OR matches query
				if (!normalizedQuery || nameScore > 0) {
					const totalScore = connectionScore + nameScore;
					results.push(createNodeSearchResult(nodeType, totalScore));
				}
			}
		} catch (error) {
			console.error(`Error processing node type "${nodeType.name}" for ${field}:`, error);
		}
	}

	return sortAndLimitResults(results, limit);
}
