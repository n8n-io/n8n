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
import { processWorkflowExamples } from './utils/mermaid.utils';
import { fetchWorkflowsFromTemplates } from './web/templates';

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

						// Fetch workflow examples using shared utility
						const result = await fetchWorkflowsFromTemplates({ search: query.search }, { logger });

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

				// Process workflows to get mermaid diagrams
				const processedResults = processWorkflowExamples(deduplicatedResults, {
					includeNodeParameters: false,
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
				};

				// Build response message and report
				const responseMessage = buildResponseMessage(output);
				reporter.complete(output);

				// Deduplicate template IDs
				const uniqueTemplateIds = [...new Set(allTemplateIds)];

				// Debug: Log what we're caching
				logger?.debug('Caching workflow templates in state', {
					templateCount: deduplicatedResults.length,
					templateNames: deduplicatedResults.map((w) => w.name),
				});

				// Return success response with templates and template IDs stored in state
				return createSuccessResponse(config, responseMessage, {
					templateIds: uniqueTemplateIds,
					cachedTemplates: deduplicatedResults,
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
