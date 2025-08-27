import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { tool } from '@langchain/core/tools';
import type { INode, INodeTypeDescription, INodeParameters, Logger } from 'n8n-workflow';
import { z } from 'zod';

import { createParameterUpdaterChain } from '../chains/parameter-updater';
import { ValidationError, ParameterUpdateError, ToolExecutionError } from '../errors';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, getWorkflowState, updateNodeInWorkflow } from './helpers/state';
import {
	validateNodeExists,
	findNodeType,
	createNodeNotFoundError,
	createNodeTypeNotFoundError,
} from './helpers/validation';
import {
	extractNodeParameters,
	formatChangesForPrompt,
	updateNodeWithParameters,
	fixExpressionPrefixes,
} from './utils/parameter-update.utils';
import type { UpdateNodeParametersOutput } from '../types/tools';

/**
 * Schema for update node parameters input
 */
const updateNodeParametersSchema = z.object({
	nodeId: z.string().describe('The ID of the node to update'),
	changes: z
		.array(z.string())
		.min(1)
		.describe(
			'Array of natural language changes to apply to the node parameters (e.g., "Set the URL to call the weather API", "Add an API key header")',
		),
});

/**
 * Build a success message for the parameter update
 */
function buildSuccessMessage(node: INode, changes: string[]): string {
	const changesList = changes.map((c) => `- ${c}`).join('\n');
	return `Successfully updated parameters for node "${node.name}" (${node.type}):\n${changesList}`;
}

/**
 * Process parameter updates using the LLM chain
 */
async function processParameterUpdates(
	node: INode,
	nodeType: INodeTypeDescription,
	nodeId: string,
	changes: string[],
	state: ReturnType<typeof getWorkflowState>,
	llm: BaseChatModel,
	logger?: Logger,
	instanceUrl?: string,
): Promise<INodeParameters> {
	const workflow = getCurrentWorkflow(state);

	// Get current parameters
	const currentParameters = extractNodeParameters(node);

	// Format inputs for the chain
	const formattedChanges = formatChangesForPrompt(changes);

	// Get the node's properties definition as JSON
	const nodePropertiesJson = JSON.stringify(nodeType.properties || [], null, 2);

	// Call the parameter updater chain with dynamic prompt building
	const parametersChain = createParameterUpdaterChain(
		llm,
		{
			nodeType: node.type,
			nodeDefinition: nodeType,
			requestedChanges: changes,
		},
		logger,
	);

	const newParameters = (await parametersChain.invoke({
		workflow_json: workflow,
		execution_schema: state.workflowContext?.executionSchema ?? 'NO SCHEMA',
		execution_data: state.workflowContext?.executionData ?? 'NO EXECUTION DATA YET',
		node_id: nodeId,
		node_name: node.name,
		node_type: node.type,
		current_parameters: JSON.stringify(currentParameters, null, 2),
		node_definition: nodePropertiesJson,
		changes: formattedChanges,
		instanceUrl: instanceUrl ?? '',
	})) as INodeParameters;

	// Ensure newParameters is a valid object
	if (!newParameters || typeof newParameters !== 'object') {
		throw new ParameterUpdateError('Invalid parameters returned from LLM', {
			nodeId,
			nodeType: node.type,
		});
	}

	// Ensure parameters property exists and is valid
	if (!newParameters.parameters || typeof newParameters.parameters !== 'object') {
		throw new ParameterUpdateError('Invalid parameters structure returned from LLM', {
			nodeId,
			nodeType: node.type,
		});
	}

	// Fix expression prefixes in the new parameters
	return fixExpressionPrefixes(newParameters.parameters) as INodeParameters;
}

/**
 * Factory function to create the update node parameters tool
 */
export function createUpdateNodeParametersTool(
	nodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	logger?: Logger,
	instanceUrl?: string,
) {
	return tool(
		async (input, config) => {
			const reporter = createProgressReporter(config, 'update_node_parameters');

			try {
				// Validate input using Zod schema
				const validatedInput = updateNodeParametersSchema.parse(input);
				const { nodeId, changes } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

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
				const nodeType = findNodeType(node.type, nodeTypes);
				if (!nodeType) {
					const error = createNodeTypeNotFoundError(node.type);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Report progress
				reportProgress(reporter, `Updating parameters for node "${node.name}"`, {
					nodeId,
					changes,
				});

				try {
					const updatedParameters = await processParameterUpdates(
						node,
						nodeType,
						nodeId,
						changes,
						state,
						llm,
						logger,
						instanceUrl,
					);

					// Create updated node
					const updatedNode = updateNodeWithParameters(node, updatedParameters);

					// Build success message
					const message = buildSuccessMessage(node, changes);

					// Report completion
					const output: UpdateNodeParametersOutput = {
						nodeId,
						nodeName: node.name,
						nodeType: node.type,
						updatedParameters,
						appliedChanges: changes,
						message,
					};
					reporter.complete(output);

					// Return success with state updates
					const stateUpdates = updateNodeInWorkflow(state, nodeId, updatedNode);
					return createSuccessResponse(config, message, stateUpdates);
				} catch (error) {
					if (error instanceof ParameterUpdateError) {
						reporter.error(error);
						return createErrorResponse(config, error);
					}
					const toolError = new ToolExecutionError(
						`Failed to update node parameters: ${error instanceof Error ? error.message : 'Unknown error'}`,
						{
							toolName: 'update_node_parameters',
							cause: error instanceof Error ? error : undefined,
						},
					);
					reporter.error(toolError);
					return createErrorResponse(config, toolError);
				}
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
						toolName: 'update_node_parameters',
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: 'update_node_parameters',
			description:
				'Update the parameters of an existing node in the workflow based on natural language changes. This tool intelligently modifies only the specified parameters while preserving others. Examples: "Set the URL to https://api.example.com", "Add authentication header", "Change method to POST", "Set the condition to check if status equals success".',
			schema: updateNodeParametersSchema,
		},
	);
}
