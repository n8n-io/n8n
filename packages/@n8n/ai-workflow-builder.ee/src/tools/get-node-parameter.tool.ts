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
import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { ValidationError, ToolExecutionError } from '../errors';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { validateNodeExists, createNodeNotFoundError } from './helpers/validation';
import type { GetNodeParameterOutput } from '../types/tools';

const DISPLAY_TITLE = 'Getting node parameter';

/**
 * Schema for getting specific node parameter
 */
const getNodeParameterSchema = z.object({
	nodeId: z
		.string()
		.describe(
			'REQUIRED: The node UUID (e.g., "e9f71f78-40c5-4109-b742-11feca4ca0b1"). Do NOT use node names - only UUIDs work. Get the UUID from add_node response or workflow state.',
		),
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

export const GET_NODE_PARAMETER_TOOL: BuilderToolBase = {
	toolName: 'get_node_parameter',
	displayTitle: DISPLAY_TITLE,
};

/**
 * Factory function to create the get node parameter tool
 */
export function createGetNodeParameterTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				GET_NODE_PARAMETER_TOOL.toolName,
				DISPLAY_TITLE,
			);

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

					// Check if the ID looks like a UUID (helps detect when names are used instead)
					const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
					const isLikelyNodeName = !uuidPattern.test(nodeId);

					const baseError = createNodeNotFoundError(nodeId);
					const errorMessage = isLikelyNodeName
						? `${baseError.message}. HINT: "${nodeId}" looks like a node name, not a UUID. You must use the node's UUID (e.g., "e9f71f78-40c5-4109-b742-11feca4ca0b1") from the add_node response.`
						: baseError.message;

					const error = { ...baseError, message: errorMessage };
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Extract
				const parameterValue = extractParameterValue(node, path);
				if (parameterValue === undefined) {
					logger?.debug(`Parameter path ${path} not found in node ${node.name}`);

					// Get available parameter paths for better error message
					const availableParams = Object.keys(node.parameters || {});
					const availableParamsHint =
						availableParams.length > 0
							? `Available top-level parameters: ${availableParams.join(', ')}`
							: 'This node has no parameters set yet';

					const error = new ValidationError(
						`Parameter path "${path}" not found in node "${node.name}". ${availableParamsHint}. IMPORTANT: Only use get_node_parameter when the workflow JSON shows "[TRIMMED]" for a parameter value. If the parameter doesn't exist, you cannot retrieve it - the node may not have this parameter configured yet.`,
						{
							extra: { nodeId, path, availableParams },
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
						toolName: GET_NODE_PARAMETER_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_NODE_PARAMETER_TOOL.toolName,
			description: `Retrieve a specific parameter value from a node.

WHEN TO USE THIS TOOL:
- ONLY when the workflow JSON shows "[TRIMMED]" as a parameter value
- This indicates the parameter was too large and was omitted from the context

WHEN NOT TO USE THIS TOOL:
- If the parameter is already visible in the workflow JSON - just read it directly
- If the node was just created and hasn't been configured yet - parameters don't exist yet
- If you're guessing parameter names - check the workflow JSON first to see what parameters exist

COMMON MISTAKE: Calling this tool for parameters that don't exist. If a node hasn't been configured with a parameter, this tool cannot retrieve it. The parameter must already exist in the node's configuration.`,
			schema: getNodeParameterSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_NODE_PARAMETER_TOOL,
	};
}
