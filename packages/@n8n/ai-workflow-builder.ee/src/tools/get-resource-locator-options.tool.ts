import { tool } from '@langchain/core/tools';
import {
	findNodeParameterProperty,
	formatResourceLocatorOptionsForLLM,
	getDynamicNodeParameterLookup,
	getRequiredNodeCredentialSlots,
	hasNodeCredentials,
	toDynamicParameterPath,
} from '@n8n/ai-utilities/node-catalog';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '../errors';
import type { ResourceLocatorCallback } from '../types/callbacks';
import type { BuilderTool, BuilderToolBase } from '../utils/stream-processor';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, getWorkflowState } from './helpers/state';
import {
	validateNodeExists,
	findNodeType,
	createNodeNotFoundError,
	createNodeTypeNotFoundError,
} from './helpers/validation';

const TOOL_NAME = 'get_resource_locator_options';
const DISPLAY_TITLE = 'Fetching resource options';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Schema for get resource locator options input
 */
const getResourceLocatorOptionsSchema = z.object({
	nodeId: z.string().describe('The ID of the node to fetch resource locator options for'),
	parameterPath: z
		.string()
		.describe(
			'The path to the resource locator parameter (e.g., "calendarId", "model", "boardId")',
		),
	filter: z.string().optional().describe('Optional filter string to narrow down results'),
});

export const GET_RESOURCE_LOCATOR_OPTIONS_TOOL: BuilderToolBase = {
	toolName: TOOL_NAME,
	displayTitle: DISPLAY_TITLE,
};

/**
 * Factory function to create the get resource locator options tool
 */
export function createGetResourceLocatorOptionsTool(
	nodeTypes: INodeTypeDescription[],
	resourceLocatorCallback?: ResourceLocatorCallback,
	logger?: Logger,
): BuilderTool {
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(config, TOOL_NAME, DISPLAY_TITLE);

			try {
				// Validate input
				const validatedInput = getResourceLocatorOptionsSchema.parse(input);
				const { nodeId, parameterPath, filter } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Check if callback is available
				if (!resourceLocatorCallback) {
					const error = new ValidationError(
						'Resource locator fetching is not available. The workflow builder service may not have been configured with credentials support.',
					);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Get current state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				// Find the node
				const node = validateNodeExists(nodeId, workflow.nodes);
				if (!node) {
					const error = createNodeNotFoundError(nodeId);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Find the node type
				const nodeType = findNodeType(node.type, node.typeVersion, nodeTypes);
				if (!nodeType) {
					const error = createNodeTypeNotFoundError(node.type);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				const property = findNodeParameterProperty(nodeType.properties, parameterPath);
				const lookup = property ? getDynamicNodeParameterLookup(property) : null;
				if (!lookup || lookup.kind === 'loadOptionsRouting') {
					const error = new ValidationError(
						`Parameter "${parameterPath}" on node "${node.name}" is not a resource locator or load-options parameter with list search capability`,
						{ extra: { nodeId, parameterPath } },
					);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Check if node has credentials configured (only if node type requires them)
				// Internal nodes like DataTable don't require credentials
				const credentials = node.credentials;
				const credentialSlots = getRequiredNodeCredentialSlots(nodeType);

				if (
					credentialSlots.length > 0 &&
					!lookup.skipCredentialsCheck &&
					!hasNodeCredentials(credentials)
				) {
					const error = new ValidationError(
						`Node "${node.name}" does not have credentials configured. Set up credentials before fetching resource options.`,
					);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				reportProgress(reporter, `Fetching options for "${parameterPath}" on node "${node.name}"`, {
					nodeId,
					parameterPath,
					searchMethod: lookup.methodName,
				});

				// Call the resource locator callback with timeout
				try {
					const result = await Promise.race([
						resourceLocatorCallback(
							lookup.methodName,
							toDynamicParameterPath(parameterPath),
							{ name: node.type, version: node.typeVersion },
							node.parameters ?? {},
							credentials,
							filter,
						),
						new Promise<never>((_, reject) =>
							setTimeout(() => reject(new Error('Request timed out')), DEFAULT_TIMEOUT_MS),
						),
					]);

					const formattedOptions = formatResourceLocatorOptionsForLLM(
						result.results,
						parameterPath,
					);

					reporter.complete({
						parameterPath,
						optionsCount: result.results.length,
						hasPagination: !!result.paginationToken,
					});

					return createSuccessResponse(config, formattedOptions);
				} catch (callbackError) {
					const errorMessage =
						callbackError instanceof Error
							? callbackError.message
							: 'Unknown error fetching options';

					logger?.warn('Resource locator callback failed', {
						nodeId,
						parameterPath,
						searchMethod: lookup.methodName,
						error: errorMessage,
					});

					const error = new ToolExecutionError(
						`Failed to fetch options for "${parameterPath}": ${errorMessage}`,
						{
							toolName: TOOL_NAME,
							cause: callbackError instanceof Error ? callbackError : undefined,
						},
					);
					reporter.error(error);
					return createErrorResponse(config, error);
				}
			} catch (error) {
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
						toolName: TOOL_NAME,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: TOOL_NAME,
			description:
				'Fetch available options for a resource locator parameter. Use this when a node parameter requires selecting from a dynamic list (e.g., calendars, boards, models, channels). Returns the available options that can be used to configure the parameter.',
			schema: getResourceLocatorOptionsSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_RESOURCE_LOCATOR_OPTIONS_TOOL,
	};
}
