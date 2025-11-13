import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import type { GetWorkflowExamplesOutput, WorkflowMetadata } from '@/types';
import { categories } from '@/types/web/templates';
import type { BuilderToolBase } from '@/utils/stream-processor';

import { ValidationError, ToolExecutionError } from '../errors';
import { createProgressReporter, createBatchProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { fetchTemplateList, fetchTemplateByID } from './web/templates';

/**
 * Workflow example query schema
 */
const workflowExampleQuerySchema = z.object({
	search: z.string().optional().describe('Search term to find workflow examples'),
	category: z.enum(categories).optional().describe('Filter by workflow category'),
});

/**
 * Main schema for get workflow examples tool
 */
const getWorkflowExamplesSchema = z.object({
	queries: z
		.array(workflowExampleQuerySchema)
		.min(1)
		.describe('Array of search queries to find workflow examples'),
});

/**
 * Inferred types from schemas
 */
type WorkflowExampleQuery = z.infer<typeof workflowExampleQuerySchema>;

/**
 * Fetch workflow examples from the API
 */
async function fetchWorkflowExamples(
	query: WorkflowExampleQuery,
	logger?: Logger,
): Promise<{ workflows: WorkflowMetadata[]; totalFound: number }> {
	logger?.debug('Fetching workflow examples with query', { query });

	// First, fetch the list of workflow templates (metadata)
	const response = await fetchTemplateList({
		search: query.search,
		category: query.category,
	});

	// Then fetch complete workflow data for each template
	const workflowMetadata: Array<WorkflowMetadata | undefined> = await Promise.all(
		response.workflows.map(async (workflow) => {
			try {
				const fullWorkflow = await fetchTemplateByID(workflow.id);
				return {
					name: workflow.name,
					description: workflow.description,
					workflow: fullWorkflow.workflow,
				};
			} catch (error) {
				// failed to fetch a workflow, ignore it for now
				logger?.warn(`Failed to fetch full workflow for template ${workflow.id}`, { error });
				return undefined;
			}
		}),
	);

	const finalMetadata: WorkflowMetadata[] = workflowMetadata.filter(
		(metadata) => metadata !== undefined,
	);
	return {
		workflows: finalMetadata,
		totalFound: response.totalWorkflows,
	};
}

/**
 * Build a human-readable identifier for a query
 */
function buildQueryIdentifier(query: {
	search?: string;
	category?: string;
	apps?: string;
	nodes?: string;
}): string {
	const parts: string[] = [];

	if (query.search) {
		parts.push(`"${query.search}"`);
	}
	if (query.category) {
		parts.push(`category: ${query.category}`);
	}
	if (query.apps) {
		parts.push(`apps: ${query.apps}`);
	}
	if (query.nodes) {
		parts.push(`nodes: ${query.nodes}`);
	}

	return parts.length > 0 ? parts.join(', ') : 'all workflows';
}

/**
 * Build the response message from search results
 */
function buildResponseMessage(results: WorkflowMetadata[]): string {
	if (results.length === 0) {
		return 'No workflow examples found';
	}

	let responseContent = `Found ${results.length} workflow example(s):\n`;

	for (const metadata of results) {
		responseContent += `\n${metadata.name}`;
		if (metadata.description) {
			responseContent += `\nDescription: ${metadata.description}`;
		}
		responseContent += `\nNodes: ${metadata.workflow.nodes.length}`;
		responseContent += '\n';
	}

	return responseContent;
}

export const GET_WORKFLOW_EXAMPLES_TOOL: BuilderToolBase = {
	toolName: 'get_workflow_examples',
	displayTitle: 'Retrieving workflow examples',
};

/**
 * Factory function to create the get workflow examples tool
 */
export function createGetWorkflowExamplesTool(logger?: Logger) {
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				GET_WORKFLOW_EXAMPLES_TOOL.toolName,
				GET_WORKFLOW_EXAMPLES_TOOL.displayTitle,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = getWorkflowExamplesSchema.parse(input);
				const { queries } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				let allResults: WorkflowMetadata[] = [];

				// Create batch reporter for progress tracking
				const batchReporter = createBatchProgressReporter(reporter, 'Retrieving workflow examples');
				batchReporter.init(queries.length);

				// Process each query
				for (const query of queries) {
					const identifier = buildQueryIdentifier(query);

					try {
						// Report progress
						batchReporter.next(identifier);

						// Fetch workflow examples
						const result = await fetchWorkflowExamples(query, logger);

						// Add to results
						allResults = allResults.concat(result.workflows);
					} catch (error) {
						logger?.error('Error fetching workflow examples', { error });
					}
				}

				// Complete batch reporting
				batchReporter.complete();

				// Build response message
				const responseMessage = buildResponseMessage(allResults);

				// Report completion
				const output: GetWorkflowExamplesOutput = {
					examples: allResults,
					totalResults: allResults.length,
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
						toolName: GET_WORKFLOW_EXAMPLES_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_WORKFLOW_EXAMPLES_TOOL.toolName,
			description: `Retrieve workflow examples from n8n's workflow library to use as reference for building workflows.

This tool searches for existing workflow examples that match specific criteria. The retrieved workflows serve as reference material to understand common patterns, node configurations, and best practices.

Usage:
- Provide search criteria to find relevant workflow examples
- Search by keywords, categories, specific apps/nodes, or combinations
- Results include workflow metadata, summaries, and full workflow data for reference

Common search patterns:
1. Keyword search: { search: "email automation" }
2. Category filter: { category: "Marketing", rows: 10 }
3. App-specific: { apps: "Gmail,Slack", search: "notification" }
4. Node-specific: { nodes: "HTTP Request", category: "API" }
5. Combined filters: { search: "data processing", category: "Data", sort: "popular", price: "free" }

Parameters:
- search: Keywords to search for in workflow names/descriptions
- rows: Number of results per query (default varies by API)
- page: Page number for pagination
- category: Filter by workflow category (e.g., "Marketing", "Sales", "Data")
- apps: Comma-separated list of app names to filter by
- nodes: Comma-separated list of node types to filter by
- sort: Sort order (e.g., "popular", "recent", "relevant")
- combineWith: Combine search with additional criteria
- price: Filter by price tier (e.g., "free", "paid")

You can search for multiple different criteria at once by providing an array of queries.`,
			schema: getWorkflowExamplesSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_WORKFLOW_EXAMPLES_TOOL,
	};
}
