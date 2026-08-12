import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '../errors';
import type { GetExecutionSchemaOutput } from '../types/tools';
import type { BuilderTool, BuilderToolBase } from '../utils/stream-processor';
import { truncateJson } from '../utils/truncate-json';
import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getWorkflowState } from './helpers/state';

const DISPLAY_TITLE = 'Getting execution schema';

/**
 * Schema for getting execution schema
 */
const getExecutionSchemaSchema = z.object({
	nodeName: z
		.string()
		.optional()
		.describe('Optional: Filter to get schema for a specific node only'),
});

function formatExecutionSchema(
	schema: Array<{ nodeName: string; schema: unknown }>,
	nodeName?: string,
): string {
	const filtered = nodeName ? schema.filter((s) => s.nodeName === nodeName) : schema;

	if (filtered.length === 0) {
		return nodeName
			? `No execution schema found for node "${nodeName}"`
			: 'No execution schema available';
	}

	const parts = ['<execution_schema>'];
	parts.push(truncateJson(filtered));
	parts.push('</execution_schema>');

	return parts.join('\n');
}

export const GET_EXECUTION_SCHEMA_TOOL: BuilderToolBase = {
	toolName: 'get_execution_schema',
	displayTitle: DISPLAY_TITLE,
};

/**
 * Factory function to create the get execution schema tool
 */
export function createGetExecutionSchemaTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				GET_EXECUTION_SCHEMA_TOOL.toolName,
				DISPLAY_TITLE,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = getExecutionSchemaSchema.parse(input);
				const { nodeName } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get current state
				const state = getWorkflowState();
				const executionSchema = state.workflowContext?.executionSchema ?? [];

				logger?.debug(
					`Getting execution schema${nodeName ? ` for node ${nodeName}` : ''}, found ${executionSchema.length} entries`,
				);

				// Format the response
				const formattedSchema = formatExecutionSchema(executionSchema, nodeName);

				const output: GetExecutionSchemaOutput = {
					found: executionSchema.length > 0,
					count: nodeName
						? executionSchema.filter((s) => s.nodeName === nodeName).length
						: executionSchema.length,
					message:
						executionSchema.length > 0 ? 'Execution schema retrieved' : 'No schema available',
				};
				reporter.complete(output);

				// Return success response
				return createSuccessResponse(config, formattedSchema);
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
						toolName: GET_EXECUTION_SCHEMA_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_EXECUTION_SCHEMA_TOOL.toolName,
			description:
				'Get the execution schema showing the output data structure from the last workflow execution. Returns the raw n8n schema format with node names and their output schemas. Use this to understand what fields are available from each node.',
			schema: getExecutionSchemaSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_EXECUTION_SCHEMA_TOOL,
	};
}
