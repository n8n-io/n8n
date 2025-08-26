import { tool } from '@langchain/core/tools';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '../errors';
import { NodeSearchEngine } from './engines/node-search-engine';
import { createProgressReporter, createBatchProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import type { NodeSearchResult } from '../types/nodes';
import type { NodeSearchOutput } from '../types/tools';

/**
 * Search query schema - simplified for better LLM compatibility
 */
const searchQuerySchema = z.object({
	queryType: z.enum(['name', 'subNodeSearch']).describe('Type of search to perform'),
	query: z.string().optional().describe('Search term to filter results'),
	connectionType: z
		.nativeEnum(NodeConnectionTypes)
		.optional()
		.describe('For subNodeSearch: connection type like ai_languageModel, ai_tool, etc.'),
});

/**
 * Main schema for node search tool
 */
const nodeSearchSchema = z.object({
	queries: z
		.array(searchQuerySchema)
		.min(1)
		.describe('Array of search queries to find different types of nodes'),
});

/**
 * Inferred types from schemas
 */
type SearchQuery = z.infer<typeof searchQuerySchema>;

const SEARCH_LIMIT = 5;

/**
 * Process a single search query
 */
function processQuery(
	query: SearchQuery,
	searchEngine: NodeSearchEngine,
): { searchResults: NodeSearchResult[]; searchIdentifier: string } {
	if (query.queryType === 'name') {
		// Name-based search
		const searchTerm = query.query;
		if (!searchTerm) {
			return {
				searchResults: [],
				searchIdentifier: '',
			};
		}
		const searchResults = searchEngine.searchByName(searchTerm, SEARCH_LIMIT);
		return {
			searchResults,
			searchIdentifier: searchTerm,
		};
	} else {
		// Sub-node search by connection type
		const connectionType = query.connectionType;
		if (!connectionType) {
			return {
				searchResults: [],
				searchIdentifier: '',
			};
		}
		const searchResults = searchEngine.searchByConnectionType(
			connectionType,
			SEARCH_LIMIT,
			query.query,
		);
		const searchIdentifier = query.query
			? `sub-nodes with ${connectionType} output matching "${query.query}"`
			: `sub-nodes with ${connectionType} output`;
		return {
			searchResults,
			searchIdentifier,
		};
	}
}

/**
 * Build the response message from search results
 */
function buildResponseMessage(
	results: NodeSearchOutput['results'],
	nodeTypes: INodeTypeDescription[],
): string {
	const searchEngine = new NodeSearchEngine(nodeTypes);
	let responseContent = '';

	for (const { query, results: searchResults } of results) {
		if (responseContent) responseContent += '\n\n';

		if (searchResults.length === 0) {
			responseContent += `No nodes found matching "${query}"`;
		} else {
			responseContent += `Found ${searchResults.length} nodes matching "${query}":${searchResults
				.map((node) => searchEngine.formatResult(node))
				.join('')}`;
		}
	}

	return responseContent;
}

/**
 * Factory function to create the node search tool
 */
export function createNodeSearchTool(nodeTypes: INodeTypeDescription[]) {
	const DISPLAY_TITLE = 'Searching nodes';

	const dynamicTool = tool(
		(input, config) => {
			const reporter = createProgressReporter(config, 'search_nodes', DISPLAY_TITLE);

			try {
				// Validate input using Zod schema
				const validatedInput = nodeSearchSchema.parse(input);
				const { queries } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				const allResults: NodeSearchOutput['results'] = [];

				// Create search engine instance
				const searchEngine = new NodeSearchEngine(nodeTypes);

				// Create batch reporter for progress tracking
				const batchReporter = createBatchProgressReporter(reporter, 'Searching nodes');
				batchReporter.init(queries.length);

				// Process each query
				for (const searchQuery of queries) {
					const { searchResults, searchIdentifier } = processQuery(searchQuery, searchEngine);

					// Report progress
					batchReporter.next(searchIdentifier);

					// Add to results
					allResults.push({
						query: searchIdentifier,
						results: searchResults,
					});
				}

				// Complete batch reporting
				batchReporter.complete();

				// Build response message
				const responseMessage = buildResponseMessage(allResults, nodeTypes);

				// Report completion
				const output: NodeSearchOutput = {
					results: allResults,
					totalResults: allResults.reduce((sum, r) => sum + r.results.length, 0),
					message: responseMessage,
				};
				reporter.complete(output);

				// Return success response
				return createSuccessResponse(config, responseMessage);
			} catch (error) {
				// Handle validation or unexpected errors
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Unknown error occurred',
					{
						toolName: 'search_nodes',
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
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

	return {
		tool: dynamicTool,
		displayTitle: DISPLAY_TITLE,
	};
}
