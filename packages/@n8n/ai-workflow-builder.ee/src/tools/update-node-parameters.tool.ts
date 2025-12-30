import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { tool } from '@langchain/core/tools';
import type {
	INode,
	INodeTypeDescription,
	INodeParameters,
	Logger,
	INodeProperties,
} from 'n8n-workflow';
import { z } from 'zod';

import type { ParameterEntry } from '@/schemas/parameter-entry.schema';
import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';
import { trimWorkflowJSON } from '@/utils/trim-workflow-context';

import { createParameterUpdaterChain } from '../chains/parameter-updater';
import { ValidationError, ParameterUpdateError, ToolExecutionError } from '../errors';
import type { UpdateNodeParametersOutput } from '../types/tools';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, getWorkflowState, updateNodeInWorkflow } from './helpers/state';
import {
	validateNodeExists,
	findNodeType,
	createNodeNotFoundError,
	createNodeTypeNotFoundError,
} from './helpers/validation';
import { arrayToNodeParameters } from './utils/array-to-parameters.utils';
import {
	extractNodeParameters,
	formatChangesForPrompt,
	updateNodeWithParameters,
	fixExpressionPrefixes,
} from './utils/parameter-update.utils';
import {
	validateParametersWithDisplayOptions,
	formatValidationIssuesForLLM,
} from './utils/parameter-validation.utils';

/**
 * Schema for update node parameters input
 * Note: resource/operation are automatically detected from the node's existing parameters
 * (set by Builder via initialParameters) for filtering purposes.
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
 * Check if a property should be visible for a specific node version.
 * Only evaluates @version conditions, ignoring other displayOptions.
 *
 * @param property - The node property to check
 * @param nodeVersion - The version of the node
 * @returns true if the property is visible for the given version
 */
function isPropertyVisibleForVersion(property: INodeProperties, nodeVersion: number): boolean {
	const displayOptions = property.displayOptions;

	// No displayOptions means always visible
	if (!displayOptions) {
		return true;
	}

	const { show, hide } = displayOptions;

	// Check 'show' conditions for @version
	if (show?.['@version']) {
		const versionConditions = show['@version'];
		const matches = checkVersionCondition(versionConditions, nodeVersion);
		if (!matches) {
			return false; // Version doesn't match show condition
		}
	}

	// Check 'hide' conditions for @version
	if (hide?.['@version']) {
		const versionConditions = hide['@version'];
		const matches = checkVersionCondition(versionConditions, nodeVersion);
		if (matches) {
			return false; // Version matches hide condition
		}
	}

	return true;
}

/**
 * Check if a version matches the given version conditions.
 * Supports both simple values (e.g., [1, 2]) and complex conditions (e.g., [{ _cnd: { gte: 2.2 } }])
 */
function checkVersionCondition(conditions: unknown[], nodeVersion: number): boolean {
	return conditions.some((condition) => {
		// Simple value match
		if (typeof condition === 'number') {
			return condition === nodeVersion;
		}

		// Complex condition with _cnd operator
		if (
			condition &&
			typeof condition === 'object' &&
			'_cnd' in condition &&
			typeof (condition as Record<string, unknown>)._cnd === 'object'
		) {
			const cnd = (condition as { _cnd: Record<string, number> })._cnd;
			const [operator, targetValue] = Object.entries(cnd)[0];

			switch (operator) {
				case 'eq':
					return nodeVersion === targetValue;
				case 'not':
					return nodeVersion !== targetValue;
				case 'gte':
					return nodeVersion >= targetValue;
				case 'lte':
					return nodeVersion <= targetValue;
				case 'gt':
					return nodeVersion > targetValue;
				case 'lt':
					return nodeVersion < targetValue;
				default:
					return false;
			}
		}

		return false;
	});
}

/**
 * Filter node properties to only include those visible for a specific version.
 * This ONLY evaluates @version conditions, preserving properties that depend
 * on other parameter values (like resource/operation).
 *
 * @param properties - The node's properties array
 * @param nodeVersion - The version of the node
 * @returns Filtered array of properties visible for the given version
 */
function filterPropertiesByVersion(
	properties: INodeProperties[],
	nodeVersion: number,
	_nodeTypeDescription: INodeTypeDescription,
): INodeProperties[] {
	return properties.filter((property) => isPropertyVisibleForVersion(property, nodeVersion));
}

/**
 * Check if a property should be visible for a specific resource.
 */
function isPropertyVisibleForResource(property: INodeProperties, resource: string): boolean {
	const displayOptions = property.displayOptions;

	// No displayOptions or no resource condition means visible for all resources
	if (!displayOptions?.show?.resource && !displayOptions?.hide?.resource) {
		return true;
	}

	// Check 'show' conditions for resource
	if (displayOptions.show?.resource) {
		const resourceCondition = displayOptions.show.resource;
		if (!resourceCondition.includes(resource)) {
			return false;
		}
	}

	// Check 'hide' conditions for resource
	if (displayOptions.hide?.resource) {
		const resourceCondition = displayOptions.hide.resource;
		if (resourceCondition.includes(resource)) {
			return false;
		}
	}

	return true;
}

/**
 * Check if a property should be visible for a specific operation.
 */
function isPropertyVisibleForOperation(property: INodeProperties, operation: string): boolean {
	const displayOptions = property.displayOptions;

	// No displayOptions or no operation condition means visible for all operations
	if (!displayOptions?.show?.operation && !displayOptions?.hide?.operation) {
		return true;
	}

	// Check 'show' conditions for operation
	if (displayOptions.show?.operation) {
		const operationCondition = displayOptions.show.operation;
		if (!operationCondition.includes(operation)) {
			return false;
		}
	}

	// Check 'hide' conditions for operation
	if (displayOptions.hide?.operation) {
		const operationCondition = displayOptions.hide.operation;
		if (operationCondition.includes(operation)) {
			return false;
		}
	}

	return true;
}

/**
 * Filter node properties by resource and operation.
 * This dramatically reduces the context sent to the LLM for nodes with many resources/operations.
 *
 * @param properties - The node's properties array
 * @param resource - The resource to filter by (optional)
 * @param operation - The operation to filter by (optional)
 * @returns Filtered array of properties
 */
function filterPropertiesByResourceOperation(
	properties: INodeProperties[],
	resource?: string,
	operation?: string,
): INodeProperties[] {
	return properties.filter((property) => {
		// If resource is specified, check resource visibility
		if (resource && !isPropertyVisibleForResource(property, resource)) {
			return false;
		}

		// If operation is specified, check operation visibility
		if (operation && !isPropertyVisibleForOperation(property, operation)) {
			return false;
		}

		return true;
	});
}

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
	resource?: string,
	operation?: string,
): Promise<INodeParameters> {
	const workflow = getCurrentWorkflow(state);

	// Get current parameters
	const currentParameters = extractNodeParameters(node);

	// Format inputs for the chain
	const formattedChanges = formatChangesForPrompt(changes);

	// Step 1: Filter by version
	const versionFilteredProperties = filterPropertiesByVersion(
		nodeType.properties || [],
		node.typeVersion,
		nodeType,
	);

	// Step 2: Filter by resource/operation (if provided or auto-detected from node)
	const finalFilteredProperties = filterPropertiesByResourceOperation(
		versionFilteredProperties,
		resource,
		operation,
	);

	// Get final filtered JSON for the LLM
	const filteredPropertiesJson = JSON.stringify(finalFilteredProperties, null, 2);

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

	const chainResult = (await parametersChain.invoke({
		workflow_json: trimWorkflowJSON(workflow),
		execution_schema: state.workflowContext?.executionSchema ?? 'NO SCHEMA',
		execution_data: state.workflowContext?.executionData ?? 'NO EXECUTION DATA YET',
		node_id: nodeId,
		node_name: node.name,
		node_type: node.type,
		current_parameters: JSON.stringify(currentParameters, null, 2),
		node_definition: filteredPropertiesJson, // Use filtered properties for LLM context
		changes: formattedChanges,
		instanceUrl: instanceUrl ?? '',
	})) as { parameters: ParameterEntry[] };

	// Ensure chainResult is a valid object with parameters array
	if (!chainResult || typeof chainResult !== 'object') {
		throw new ParameterUpdateError('Invalid response returned from LLM', {
			nodeId,
			nodeType: node.type,
		});
	}

	// Ensure parameters property exists and is an array
	if (!chainResult.parameters || !Array.isArray(chainResult.parameters)) {
		throw new ParameterUpdateError(
			'Invalid parameters structure returned from LLM - expected array',
			{
				nodeId,
				nodeType: node.type,
			},
		);
	}

	// Convert array format to INodeParameters
	const newParameters = arrayToNodeParameters(chainResult.parameters);

	// Fix expression prefixes in the new parameters
	const fixedParameters = fixExpressionPrefixes(newParameters);

	// Validate parameters with display options
	const validationResult = validateParametersWithDisplayOptions(node, nodeType, fixedParameters);

	if (!validationResult.valid) {
		const validationMessage = formatValidationIssuesForLLM(validationResult);
		logger?.warn(`Parameter validation issues for node "${node.name}": ${validationMessage}`);
	}

	return fixedParameters;
}

export const UPDATING_NODE_PARAMETER_TOOL: BuilderToolBase = {
	toolName: 'update_node_parameters',
	displayTitle: 'Updating node parameters',
};

function getCustomNodeTitle(input: Record<string, unknown>, nodes?: INode[]): string {
	if ('nodeId' in input && typeof input['nodeId'] === 'string') {
		const targetNode = nodes?.find((node) => node.id === input.nodeId);
		if (targetNode) {
			return `Updating "${targetNode.name}" node parameters`;
		}
	}

	return UPDATING_NODE_PARAMETER_TOOL.displayTitle;
}

/**
 * Factory function to create the update node parameters tool
 */
export function createUpdateNodeParametersTool(
	nodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	logger?: Logger,
	instanceUrl?: string,
): BuilderTool {
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				UPDATING_NODE_PARAMETER_TOOL.toolName,
				UPDATING_NODE_PARAMETER_TOOL.displayTitle,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = updateNodeParametersSchema.parse(input);
				const { nodeId, changes } = validatedInput;

				// Get current state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				// Report tool start
				reporter.start(validatedInput, {
					customDisplayTitle: getCustomNodeTitle(input, workflow.nodes),
				});

				// Find the node
				const node = validateNodeExists(nodeId, workflow.nodes);
				if (!node) {
					const error = createNodeNotFoundError(nodeId);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Auto-detect resource/operation from node's existing parameters
				// Builder sets these via initialParameters during node creation
				const resource = node.parameters?.resource as string | undefined;
				const operation = node.parameters?.operation as string | undefined;

				// Find the node type
				const nodeType = findNodeType(node.type, node.typeVersion, nodeTypes);
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
						resource,
						operation,
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
							toolName: UPDATING_NODE_PARAMETER_TOOL.toolName,
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
						toolName: UPDATING_NODE_PARAMETER_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: UPDATING_NODE_PARAMETER_TOOL.toolName,
			description:
				'Update the parameters of an existing node in the workflow based on natural language changes. This tool intelligently modifies only the specified parameters while preserving others. Examples: "Set the URL to https://api.example.com", "Add authentication header", "Change method to POST", "Set the condition to check if status equals success".',
			schema: updateNodeParametersSchema,
		},
	);

	return {
		tool: dynamicTool,
		...UPDATING_NODE_PARAMETER_TOOL,
	};
}
