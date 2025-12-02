import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import type { GetWorkflowExamplesOutput, WorkflowMetadata } from '@/types';
import type { BuilderToolBase } from '@/utils/stream-processor';

import { ValidationError, ToolExecutionError } from '../errors';
import {
	createProgressReporter,
	createBatchProgressReporter,
	createSuccessResponse,
	createErrorResponse,
} from './helpers';
import { processWorkflowExamples } from './utils/markdown-workflow.utils';
import { fetchTemplateList, fetchTemplateByID } from './web/templates';

/**
 * Workflow example query schema
 */
const workflowExampleQuerySchema = z.object({
	search: z.string().optional().describe('Search term to find workflow examples'),
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
 * Result of fetching workflow examples including template IDs for telemetry
 */
interface FetchWorkflowExamplesResult {
	workflows: WorkflowMetadata[];
	totalFound: number;
	templateIds: number[];
}

/**
 * Fetch workflow examples from the API
 */
async function fetchWorkflowExamples(
	query: WorkflowExampleQuery,
	logger?: Logger,
): Promise<FetchWorkflowExamplesResult> {
	logger?.debug('Fetching workflow examples with query', { query });

	// First, fetch the list of workflow templates (metadata)
	const response = await fetchTemplateList({
		search: query.search,
	});

	// Then fetch complete workflow data for each template
	const workflowResults: Array<{ metadata: WorkflowMetadata; templateId: number } | undefined> =
		await Promise.all(
			response.workflows.map(async (workflow) => {
				try {
					const fullWorkflow = await fetchTemplateByID(workflow.id);
					return {
						metadata: {
							name: workflow.name,
							description: workflow.description,
							workflow: fullWorkflow.workflow,
						},
						templateId: workflow.id,
					};
				} catch (error) {
					// failed to fetch a workflow, ignore it for now
					logger?.warn(`Failed to fetch full workflow for template ${workflow.id}`, { error });
					return undefined;
				}
			}),
		);

	const validResults = workflowResults.filter(
		(result): result is { metadata: WorkflowMetadata; templateId: number } => result !== undefined,
	);

	return {
		workflows: validResults.map((r) => r.metadata),
		totalFound: response.totalWorkflows,
		templateIds: validResults.map((r) => r.templateId),
	};
}

/**
 * Build a human-readable identifier for a query
 */
function buildQueryIdentifier(query: {
	search?: string;
}): string {
	const parts: string[] = [];
	if (query.search) {
		parts.push(`search: ${query.search}`);
	}
	return parts.join(',');
}

/**
 * Build the response message from search results
 */
function buildResponseMessage(output: GetWorkflowExamplesOutput): string {
	if (output.examples.length === 0) {
		return 'No workflow examples found';
	}

	const sections: string[] = [`Found ${output.totalResults} workflow example(s):`];

	for (const example of output.examples) {
		sections.push(`\n## ${example.name}`);
		if (example.description) {
			sections.push(example.description);
		}
		sections.push(example.workflow);
	}

	return sections.join('\n');
}

export const GET_WORKFLOW_EXAMPLES_TOOL: BuilderToolBase = {
	toolName: 'get_workflow_examples',
	displayTitle: 'Retrieving workflow examples',
};

/** Tool description */
const TOOL_DESCRIPTION = `Retrieve workflow examples from n8n's workflow library to use as reference for building workflows.

This tool searches for existing workflow examples that match specific criteria.
The retrieved workflows serve as reference material to understand common patterns, node usage and connections.
Consider these workflows as ideal solutions.
The workflows will be returned in a token efficient format rather than JSON.

Usage:
- Provide search criteria to find relevant workflow examples
- Results include workflow metadata, summaries, and full workflow data for reference

Parameters:
- search: Keywords to search for in workflow names/descriptions based on the user prompt`;

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
				let allTemplateIds: number[] = [];

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
						allTemplateIds = allTemplateIds.concat(result.templateIds);
					} catch (error) {
						logger?.error('Error fetching workflow examples', { error });
					}
				}

				// Complete batch reporting
				batchReporter.complete();

				// Deduplicate results based on workflow name
				const uniqueWorkflows = new Map<string, WorkflowMetadata>();
				for (const workflow of allResults) {
					if (!uniqueWorkflows.has(workflow.name)) {
						uniqueWorkflows.set(workflow.name, workflow);
					}
				}
				const deduplicatedResults = Array.from(uniqueWorkflows.values());

				// Process workflows to get mermaid diagrams and collect node configurations in one pass
				const processedResults = processWorkflowExamples(deduplicatedResults, {
					includeNodeParameters: false,
				});

				// Get the accumulated node configurations from the last result (all results share the same map)
				const nodeConfigurations =
					processedResults.length > 0
						? processedResults[processedResults.length - 1].nodeConfigurations
						: {};

				// Debug: Log the collected configurations
				logger?.debug('Collected node configurations from workflow examples', {
					nodeTypeCount: Object.keys(nodeConfigurations).length,
					nodeTypes: Object.keys(nodeConfigurations),
					configCounts: Object.fromEntries(
						Object.entries(nodeConfigurations).map(([type, configs]) => [type, configs.length]),
					),
				});

				// Build output with formatted results
				const formattedResults = deduplicatedResults.map((workflow, index) => ({
					name: workflow.name,
					description: workflow.description,
					workflow: processedResults[index].mermaid,
				}));
				const output: GetWorkflowExamplesOutput = {
					examples: formattedResults,
					totalResults: deduplicatedResults.length,
					nodeConfigurations,
				};

				// Build response message and report
				const responseMessage = buildResponseMessage(output);
				reporter.complete(output);

				// Deduplicate template IDs
				const uniqueTemplateIds = [...new Set(allTemplateIds)];

				// Return success response with node configurations and template IDs stored in state
				return createSuccessResponse(config, responseMessage, {
					nodeConfigurations,
					templateIds: uniqueTemplateIds,
				});
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
			description: TOOL_DESCRIPTION,
			schema: getWorkflowExamplesSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_WORKFLOW_EXAMPLES_TOOL,
	};
}
