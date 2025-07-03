import { type INodeTypeDescription } from 'n8n-workflow';

import { BaseWorkflowBuilderTool, z, type ToolContext, type ToolResult } from './base';
import { NodeSearchEngine, type NodeSearchResult } from './engines/node-search-engine';

/**
 * Search query schema - simplified for better LLM compatibility
 */
const searchQuerySchema = z.object({
	queryType: z.enum(['name', 'subNodeSearch']).describe('Type of search to perform'),
	query: z.string().optional().describe('Search term to filter results'),
	connectionType: z
		.string()
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
type NodeSearchInput = z.infer<typeof nodeSearchSchema>;
type SearchQuery = z.infer<typeof searchQuerySchema>;

/**
 * Output type for the search tool
 */
interface NodeSearchOutput {
	results: Array<{
		query: string;
		results: NodeSearchResult[];
	}>;
	totalResults: number;
	message: string;
}

/**
 * Node search tool implementation using the base infrastructure
 */
export class NodeSearchTool extends BaseWorkflowBuilderTool<
	typeof nodeSearchSchema,
	NodeSearchOutput
> {
	protected readonly schema = nodeSearchSchema;
	protected readonly name = 'search_nodes' as const;
	protected readonly description = `Search for n8n nodes by name or find sub-nodes that output specific connection types. Use this before adding nodes to find the correct node types.

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

You can search for multiple different criteria at once by providing an array of queries.`;

	private readonly searchLimit = 15;

	/**
	 * Execute the search tool
	 */
	protected async execute(
		input: NodeSearchInput,
		context: ToolContext,
	): Promise<ToolResult<NodeSearchOutput>> {
		const { queries } = input;
		const allResults: NodeSearchOutput['results'] = [];

		// Create search engine instance
		const searchEngine = new NodeSearchEngine(context.nodeTypes);

		// Create batch reporter for progress tracking
		const batchReporter = context.reporter.createBatchReporter('Searching nodes');
		batchReporter.init(queries.length);

		// Process each query
		for (const searchQuery of queries) {
			const { searchResults, searchIdentifier } = await this.processQuery(
				searchQuery,
				searchEngine,
			);

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
		const responseMessage = this.buildResponseMessage(allResults);

		return {
			success: true,
			data: {
				results: allResults,
				totalResults: allResults.reduce((sum, r) => sum + r.results.length, 0),
				message: responseMessage,
			},
		};
	}

	/**
	 * Process a single search query
	 */
	private async processQuery(
		query: SearchQuery,
		searchEngine: NodeSearchEngine,
	): Promise<{ searchResults: NodeSearchResult[]; searchIdentifier: string }> {
		if (query.queryType === 'name') {
			// Name-based search
			const searchTerm = query.query || '';
			const searchResults = searchEngine.searchByName(searchTerm, this.searchLimit);
			return {
				searchResults,
				searchIdentifier: searchTerm,
			};
		} else {
			// Sub-node search by connection type
			const connectionType = query.connectionType || '';
			const searchResults = searchEngine.searchByConnectionType(
				connectionType as any,
				this.searchLimit,
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
	private buildResponseMessage(results: NodeSearchOutput['results']): string {
		const searchEngine = new NodeSearchEngine(this.nodeTypes);
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
	 * Override to provide custom success message
	 */
	protected formatSuccessMessage(output: NodeSearchOutput): string {
		return output.message;
	}
}

/**
 * Factory function to create the node search tool
 * Maintains backward compatibility with existing code
 */
export function createNodeSearchTool(nodeTypes: INodeTypeDescription[]) {
	const tool = new NodeSearchTool(nodeTypes);
	return tool.createLangChainTool();
}
