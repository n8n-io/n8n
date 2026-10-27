import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '../errors';
import type { GetExpressionDataMappingOutput } from '../types/tools';
import type { BuilderTool, BuilderToolBase } from '../utils/stream-processor';
import { truncateJson } from '../utils/truncate-json';
import type { ExpressionValue } from '../workflow-builder-agent';
import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getWorkflowState } from './helpers/state';

const DISPLAY_TITLE = 'Getting expression data mapping';

/**
 * Schema for getting expression data mapping
 */
const getExpressionDataMappingSchema = z.object({
	nodeName: z
		.string()
		.optional()
		.describe('Optional: Filter to get expression values for a specific node only'),
});

function formatExpressionValues(
	expressionValues: Record<string, ExpressionValue[]> | undefined,
	nodeName?: string,
): string {
	if (!expressionValues || Object.keys(expressionValues).length === 0) {
		return nodeName
			? `No expression data mapping found for node "${nodeName}"`
			: 'No expression data mapping available. The workflow may not have expressions or has not been executed.';
	}

	const filtered = nodeName
		? Object.fromEntries(Object.entries(expressionValues).filter(([key]) => key === nodeName))
		: expressionValues;

	if (Object.keys(filtered).length === 0) {
		return `No expression data mapping found for node "${nodeName}"`;
	}

	const parts = ['<expression_data_mapping>'];
	parts.push(truncateJson(filtered));
	parts.push('</expression_data_mapping>');

	return parts.join('\n');
}

export const GET_EXPRESSION_DATA_MAPPING_TOOL: BuilderToolBase = {
	toolName: 'get_expression_data_mapping',
	displayTitle: DISPLAY_TITLE,
};

/**
 * Factory function to create the get expression data mapping tool
 */
export function createGetExpressionDataMappingTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				GET_EXPRESSION_DATA_MAPPING_TOOL.toolName,
				DISPLAY_TITLE,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = getExpressionDataMappingSchema.parse(input);
				const { nodeName } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get current state
				const state = getWorkflowState();
				const expressionValues = state.workflowContext?.expressionValues;

				const nodeCount = expressionValues ? Object.keys(expressionValues).length : 0;
				logger?.debug(
					`Getting expression data mapping${nodeName ? ` for node ${nodeName}` : ''}, found ${nodeCount} nodes with expressions`,
				);

				// Format the response
				const formattedMapping = formatExpressionValues(expressionValues, nodeName);

				const output: GetExpressionDataMappingOutput = {
					found: nodeCount > 0,
					nodesWithExpressions: nodeCount,
					message: nodeCount > 0 ? 'Expression data mapping retrieved' : 'No expressions found',
				};
				reporter.complete(output);

				// Return success response
				return createSuccessResponse(config, formattedMapping);
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
						toolName: GET_EXPRESSION_DATA_MAPPING_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_EXPRESSION_DATA_MAPPING_TOOL.toolName,
			description:
				'Get the resolved expression values from the last workflow execution. Shows what data was used in expressions like {{ $json.fieldName }} and their resolved values.',
			schema: getExpressionDataMappingSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_EXPRESSION_DATA_MAPPING_TOOL,
	};
}
