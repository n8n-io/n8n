import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import get from 'lodash/get';
import type { INode, NodeParameterValueType } from 'n8n-workflow';
import { z } from 'zod';

import { MAX_PARAMETER_VALUE_LENGTH } from '@/constants';
import {
	createNodeParameterTooLargeError,
	getCurrentWorkflow,
	getWorkflowState,
} from '@/tools/helpers';

import { ValidationError, ToolExecutionError } from '../errors';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { validateNodeExists, createNodeNotFoundError } from './helpers/validation';
import type { GetNodeParameterOutput } from '../types/tools';

/**
 * Schema for getting specific node parameter
 */
const getNodeParameterSchema = z.object({
	nodeId: z.string().describe('The ID of the node to extract parameter value'),
	path: z
		.string()
		.describe('Path to the specific parameter to extract, e.g., "url" or "options.baseUrl"'),
});

function extractParameterValue(node: INode, path: string): NodeParameterValueType | undefined {
	const nodeParameters = node.parameters;

	return get(nodeParameters, path);
}

function formatNodeParameter(path: string, value: NodeParameterValueType): string {
	const parts = [];

	parts.push('<node_parameter>');
	parts.push('<parameter_path>');
	parts.push(path);
	parts.push('</parameter_path>');
	parts.push('<parameter_value>');

	if (typeof value === 'string') {
		parts.push(value);
	} else {
		parts.push(JSON.stringify(value, null, 2));
	}

	parts.push('</parameter_value>');
	parts.push('</node_parameter>');

	return parts.join('\n');
}

/**
 * Factory function to create the get node parameter tool
 */
export function createGetNodeParameterTool(logger?: Logger) {
	const DISPLAY_TITLE = 'Getting node parameter';

	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(config, 'get_node_parameter', DISPLAY_TITLE);

			try {
				// Validate input using Zod schema
				const validatedInput = getNodeParameterSchema.parse(input);
				const { nodeId, path } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Report progress
				logger?.debug(`Looking up parameter ${path} for ${nodeId}...`);
				reportProgress(reporter, `Looking up parameter ${path} for ${nodeId}...`);

				// Get current state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				// Find the node
				const node = validateNodeExists(nodeId, workflow.nodes);
				if (!node) {
					logger?.debug(`Node with ID ${nodeId} not found`);
					const error = createNodeNotFoundError(nodeId);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Extract
				const parameterValue = extractParameterValue(node, path);
				if (parameterValue === undefined) {
					logger?.debug(`Parameter path ${path} not found in node ${node.name}`);
					const error = new ValidationError(
						`Parameter path "${path}" not found in node "${node.name}"`,
						{
							extra: { nodeId, path },
						},
					);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Report completion
				logger?.debug(`Parameter value for path ${path} in node ${node.name} retrieved`);

				const formattedParameterValue = formatNodeParameter(path, parameterValue);

				if (formattedParameterValue.length > MAX_PARAMETER_VALUE_LENGTH) {
					const error = createNodeParameterTooLargeError(nodeId, path, MAX_PARAMETER_VALUE_LENGTH);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				const output: GetNodeParameterOutput = {
					message: 'Parameter value retrieved successfully',
				};
				reporter.complete(output);

				// Return success response
				return createSuccessResponse(config, formattedParameterValue);
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
						toolName: 'get_node_parameter',
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: 'get_node_parameter',
			description:
				'Get the value of a specific parameter of a specific node. Use this ONLY to retrieve parameters omitted in the workflow JSON context because of the size.',
			schema: getNodeParameterSchema,
		},
	);

	return {
		tool: dynamicTool,
		displayTitle: DISPLAY_TITLE,
	};
}
