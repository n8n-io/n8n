import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { tool } from '@langchain/core/tools';
import type { INode, INodeTypeDescription, INodeParameters } from 'n8n-workflow';
import { z } from 'zod';

import { parameterUpdaterChain } from '../chains/parameter-updater';
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
	validateParameters,
	mergeParameters,
} from './utils/parameter-update.utils';

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
 * Output type for the update node parameters tool
 */
interface UpdateNodeParametersOutput {
	nodeId: string;
	nodeName: string;
	nodeType: string;
	updatedParameters: INodeParameters;
	appliedChanges: string[];
	message: string;
}

/**
 * Build a success message for the parameter update
 */
function buildSuccessMessage(node: INode, changes: string[]): string {
	const changesList = changes.map((c) => `- ${c}`).join('\n');
	return `Successfully updated parameters for node "${node.name}" (${node.type}):\n${changesList}`;
}

/**
 * Factory function to create the update node parameters tool
 */
export function createUpdateNodeParametersTool(
	nodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
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
					// Get current parameters
					const currentParameters = extractNodeParameters(node);

					// Format inputs for the chain
					const formattedChanges = formatChangesForPrompt(changes);

					// Get the node's properties definition as JSON
					const nodePropertiesJson = JSON.stringify(nodeType.properties || [], null, 2);

					// Call the parameter updater chain
					const parametersChain = parameterUpdaterChain(llm);
					const newParameters = await parametersChain.invoke({
						user_workflow_prompt: state.prompt,
						workflow_json: JSON.stringify(workflow, null, 2),
						node_id: nodeId,
						node_name: node.name,
						node_type: node.type,
						current_parameters: JSON.stringify(currentParameters, null, 2),
						node_definition: nodePropertiesJson,
						changes: formattedChanges,
					});

					// Ensure newParameters is a valid object
					if (!newParameters || typeof newParameters !== 'object') {
						throw new Error('Invalid parameters returned from LLM');
					}

					// Merge the new parameters with existing ones
					const updatedParameters = mergeParameters(
						currentParameters,
						newParameters as INodeParameters,
					);

					// Validate the updated parameters
					const validation = validateParameters(updatedParameters, nodeType);
					if (!validation.valid) {
						reportProgress(reporter, 'Warning: Some required parameters may be missing', {
							missing: validation.missingRequired,
						});
					}

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
					const toolError = {
						message: `Failed to update node parameters: ${error instanceof Error ? error.message : 'Unknown error'}`,
						code: 'PARAMETER_UPDATE_FAILED',
						details: { error: error instanceof Error ? error.message : error },
					};
					reporter.error(toolError);
					return createErrorResponse(config, toolError);
				}
			} catch (error) {
				// Handle validation or unexpected errors
				const toolError = {
					message: error instanceof Error ? error.message : 'Unknown error occurred',
					code: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'EXECUTION_ERROR',
					details: error instanceof z.ZodError ? error.errors : undefined,
				};

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
