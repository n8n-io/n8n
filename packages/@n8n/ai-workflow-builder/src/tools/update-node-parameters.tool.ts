import type { INode, INodeTypeDescription, INodeParameters } from 'n8n-workflow';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { BaseWorkflowBuilderTool, z, type ToolContext, type ToolResult } from './base';
import { parameterUpdaterChain } from '../chains/parameter-updater';
import type { WorkflowState } from '../workflow-state';
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
 * Inferred type from schema
 */
type UpdateNodeParametersInput = z.infer<typeof updateNodeParametersSchema>;

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
 * Update node parameters tool implementation
 */
export class UpdateNodeParametersTool extends BaseWorkflowBuilderTool<
	typeof updateNodeParametersSchema,
	UpdateNodeParametersOutput
> {
	protected readonly schema = updateNodeParametersSchema;
	protected readonly name = 'update_node_parameters' as const;
	protected readonly description =
		'Update the parameters of an existing node in the workflow based on natural language changes. This tool intelligently modifies only the specified parameters while preserving others. Examples: "Set the URL to https://api.example.com", "Add authentication header", "Change method to POST", "Set the condition to check if status equals success".';

	/**
	 * Execute the update node parameters tool
	 */
	protected async execute(
		input: UpdateNodeParametersInput,
		context: ToolContext,
	): Promise<ToolResult<UpdateNodeParametersOutput>> {
		const { nodeId, changes } = input;
		const state = context.getCurrentTaskInput() as typeof WorkflowState.State;

		// Check if LLM is available
		if (!context.llm) {
			return {
				success: false,
				error: {
					message: 'LLM is required for parameter updates but not available in context',
					code: 'LLM_NOT_AVAILABLE',
				},
			};
		}

		// Find the node
		const nodeIndex = state.workflowJSON.nodes.findIndex((n) => n.id === nodeId);
		if (nodeIndex === -1) {
			return {
				success: false,
				error: {
					message: `Node with ID "${nodeId}" not found in the workflow`,
					code: 'NODE_NOT_FOUND',
					details: { nodeId },
				},
			};
		}

		const node = state.workflowJSON.nodes[nodeIndex];

		// Find the node type
		const nodeType = context.nodeTypes.find((nt) => nt.name === node.type);
		if (!nodeType) {
			return {
				success: false,
				error: {
					message: `Node type "${node.type}" not found`,
					code: 'NODE_TYPE_NOT_FOUND',
					details: { nodeType: node.type },
				},
			};
		}

		// Report progress
		context.reporter.progress(`Updating parameters for node "${node.name}"`, {
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
			const parametersChain = parameterUpdaterChain(context.llm);
			const newParameters = await parametersChain.invoke({
				user_workflow_prompt: state.prompt,
				workflow_json: JSON.stringify(state.workflowJSON, null, 2),
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
			const updatedParameters = mergeParameters(currentParameters, newParameters);

			// Validate the updated parameters
			const validation = validateParameters(updatedParameters, nodeType);
			if (!validation.valid) {
				context.reporter.progress('Warning: Some required parameters may be missing', {
					missing: validation.missingRequired,
				});
			}

			// Create updated node
			const updatedNode = updateNodeWithParameters(node, updatedParameters);

			// Update the workflow state
			const updatedNodes = [...state.workflowJSON.nodes];
			updatedNodes[nodeIndex] = updatedNode;

			// Build success message
			const message = this.buildSuccessMessage(node, changes);

			return {
				success: true,
				data: {
					nodeId,
					nodeName: node.name,
					nodeType: node.type,
					updatedParameters,
					appliedChanges: changes,
					message,
				},
				stateUpdates: {
					workflowJSON: {
						...state.workflowJSON,
						nodes: updatedNodes,
					},
				},
			};
		} catch (error) {
			return {
				success: false,
				error: {
					message: `Failed to update node parameters: ${error instanceof Error ? error.message : 'Unknown error'}`,
					code: 'PARAMETER_UPDATE_FAILED',
					details: { error: error instanceof Error ? error.message : error },
				},
			};
		}
	}

	/**
	 * Build a success message for the parameter update
	 */
	private buildSuccessMessage(node: INode, changes: string[]): string {
		const changesList = changes.map((c) => `- ${c}`).join('\n');
		return `Successfully updated parameters for node "${node.name}" (${node.type}):\n${changesList}`;
	}

	/**
	 * Format the success message for display
	 */
	protected formatSuccessMessage(output: UpdateNodeParametersOutput): string {
		return output.message;
	}
}

/**
 * Factory function to create the update node parameters tool
 */
export function createUpdateNodeParametersTool(
	nodeTypes: INodeTypeDescription[],
): UpdateNodeParametersTool {
	return new UpdateNodeParametersTool(nodeTypes);
}
