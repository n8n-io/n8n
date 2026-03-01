import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { tool } from '@langchain/core/tools';
import {
	checkConditions,
	type IDisplayOptions,
	type INode,
	type INodeTypeDescription,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyOptions,
	type Logger,
} from 'n8n-workflow';
import { z } from 'zod';

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
import {
	extractNodeParameters,
	formatChangesForPrompt,
	updateNodeWithParameters,
	fixExpressionPrefixes,
} from './utils/parameter-update.utils';

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
 * Check if a property should be hidden based on a specific condition key.
 * Returns true if the property should be hidden, false otherwise.
 */
function isHiddenByCondition(
	displayOptions: INodeProperties['displayOptions'],
	conditionKey: string,
	value: string | number,
): boolean {
	// Check 'show' condition - if specified but doesn't match, hide it
	const showCondition = displayOptions?.show?.[conditionKey];
	if (showCondition && !checkConditions(showCondition, [value])) {
		return true;
	}

	// Check 'hide' condition - if specified and matches, hide it
	const hideCondition = displayOptions?.hide?.[conditionKey];
	if (hideCondition && checkConditions(hideCondition, [value])) {
		return true;
	}

	return false;
}

/**
 * Type guard for INodePropertyOptions.
 * INodePropertyOptions has `name` + `value` (primitive value).
 */
function isINodePropertyOptions(item: unknown): item is INodePropertyOptions {
	return (
		typeof item === 'object' &&
		item !== null &&
		'value' in item &&
		'name' in item &&
		!('values' in item) // Distinguish from INodePropertyCollection
	);
}

/**
 * Type guard for INodePropertyCollection.
 * INodePropertyCollection has `name` + `displayName` + `values` (array of INodeProperties).
 */
function isINodePropertyCollection(item: unknown): item is INodePropertyCollection {
	if (typeof item !== 'object' || item === null) return false;
	if (!('values' in item) || !('name' in item)) return false;
	// After 'values' in item, TypeScript narrows to object & Record<'values', unknown>
	return Array.isArray(item.values);
}

/**
 * Type guard for INodeProperties.
 * INodeProperties has `name` + `type` + `default`.
 */
function isINodeProperties(item: unknown): item is INodeProperties {
	return (
		typeof item === 'object' &&
		item !== null &&
		'type' in item &&
		'name' in item &&
		'default' in item
	);
}

/**
 * Check if an item should be hidden based on @version, resource, operation conditions.
 * Used for nested items (options, collection values) that have their own displayOptions.
 */
function isItemHiddenForContext(
	displayOptions: IDisplayOptions | undefined,
	nodeVersion: number,
	currentValues: INodeParameters,
): boolean {
	if (!displayOptions) return false;

	if (isHiddenByCondition(displayOptions, '@version', nodeVersion)) return true;

	const resource = currentValues.resource;
	if (typeof resource === 'string' && isHiddenByCondition(displayOptions, 'resource', resource)) {
		return true;
	}

	const operation = currentValues.operation;
	if (
		typeof operation === 'string' &&
		isHiddenByCondition(displayOptions, 'operation', operation)
	) {
		return true;
	}

	return false;
}

/**
 * Recursively filter a property and all its nested structures.
 * Uses for-loops with type guards for proper type narrowing without coercion.
 */
function filterPropertyRecursively(
	property: INodeProperties,
	nodeVersion: number,
	currentValues: INodeParameters,
): INodeProperties {
	if (!property.options || property.options.length === 0) {
		return property;
	}

	const { type, options } = property;

	// For options/multiOptions: filter INodePropertyOptions items
	if (type === 'options' || type === 'multiOptions') {
		const filteredOptions: INodePropertyOptions[] = [];
		for (const opt of options) {
			// Type guard narrows `opt` to INodePropertyOptions inside this block
			if (isINodePropertyOptions(opt)) {
				if (!isItemHiddenForContext(opt.displayOptions, nodeVersion, currentValues)) {
					filteredOptions.push(opt);
				}
			}
		}
		return { ...property, options: filteredOptions };
	}

	// For collection: filter and recurse INodeProperties items
	if (type === 'collection') {
		const filteredOptions: INodeProperties[] = [];
		for (const prop of options) {
			// Type guard narrows `prop` to INodeProperties inside this block
			if (isINodeProperties(prop)) {
				if (!isItemHiddenForContext(prop.displayOptions, nodeVersion, currentValues)) {
					filteredOptions.push(filterPropertyRecursively(prop, nodeVersion, currentValues));
				}
			}
		}
		return { ...property, options: filteredOptions };
	}

	// For fixedCollection: process INodePropertyCollection items and recurse into values
	if (type === 'fixedCollection') {
		const filteredOptions: INodePropertyCollection[] = [];
		for (const coll of options) {
			// Type guard narrows `coll` to INodePropertyCollection inside this block
			if (isINodePropertyCollection(coll)) {
				const filteredValues: INodeProperties[] = [];
				for (const prop of coll.values) {
					if (!isItemHiddenForContext(prop.displayOptions, nodeVersion, currentValues)) {
						filteredValues.push(filterPropertyRecursively(prop, nodeVersion, currentValues));
					}
				}
				filteredOptions.push({ ...coll, values: filteredValues });
			}
		}
		return { ...property, options: filteredOptions };
	}

	return property;
}

/**
 * Check if a property is visible based on @version, resource, and operation conditions ONLY.
 * Other displayOptions conditions (aggregate, mode, action, etc.) are intentionally ignored
 * so the LLM sees all properties that could be configured for the current resource/operation.
 *
 * This prevents the LLM from hallucinating field structures when properties are hidden
 * due to conditions like `displayOptions.show.aggregate: ['aggregateIndividualFields']`.
 */
function isPropertyVisibleForContext(
	property: INodeProperties,
	nodeVersion: number,
	currentValues: INodeParameters,
): boolean {
	const displayOptions = property.displayOptions;

	// No displayOptions = always visible
	if (!displayOptions) {
		return true;
	}

	// Check @version condition
	if (isHiddenByCondition(displayOptions, '@version', nodeVersion)) {
		return false;
	}

	// Resource/operation values in n8n are always strings
	const resource = currentValues.resource;
	const operation = currentValues.operation;

	// Check resource condition
	if (typeof resource === 'string' && isHiddenByCondition(displayOptions, 'resource', resource)) {
		return false;
	}

	// Check operation condition
	if (
		typeof operation === 'string' &&
		isHiddenByCondition(displayOptions, 'operation', operation)
	) {
		return false;
	}

	// All other displayOptions conditions are ignored
	// (aggregate, mode, action, etc. - LLM should see these properties)
	return true;
}

/**
 * Filter node properties based on the node's current context (version, resource, operation).
 * Only filters by @version, resource, and operation - other displayOptions conditions are
 * intentionally ignored so the LLM sees all configurable properties for the current context.
 *
 * @param properties - The node's properties array
 * @param node - The node instance (for typeVersion)
 * @param _nodeType - The node type description (unused, kept for API compatibility)
 * @param currentValues - Current parameter values (resource, operation, etc.)
 * @returns Filtered array of properties visible in the current context
 */
function filterPropertiesForContext(
	properties: INodeProperties[],
	node: INode,
	_nodeType: INodeTypeDescription,
	currentValues: INodeParameters,
): INodeProperties[] {
	const nodeVersion = node.typeVersion;

	return (
		properties
			// First filter root-level properties
			.filter((property) => isPropertyVisibleForContext(property, nodeVersion, currentValues))
			// Then recursively filter nested structures
			.map((property) => filterPropertyRecursively(property, nodeVersion, currentValues))
	);
}

/**
 * Build a success message for the parameter update
 */
function buildSuccessMessage(node: INode, _changes: string[]): string {
	return `Updated "${node.name}" (${node.type})`;
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

	// Filter properties based on node's current context (version, resource, operation, etc.)
	const currentValues = node.parameters ?? {};
	const filteredProperties = filterPropertiesForContext(
		nodeType.properties || [],
		node,
		nodeType,
		currentValues,
	);
	const filteredPropertiesJson = JSON.stringify(filteredProperties, null, 2);

	logger?.debug('Filtered node properties for LLM context', {
		nodeId,
		nodeType: node.type,
		nodeVersion: node.typeVersion,
		resource: currentValues.resource,
		operation: currentValues.operation,
		originalCount: nodeType.properties?.length ?? 0,
		filteredCount: filteredProperties.length,
	});

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
					// Resource/operation filtering happens automatically inside processParameterUpdates
					// based on node.parameters (set by Builder via initialParameters)
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
