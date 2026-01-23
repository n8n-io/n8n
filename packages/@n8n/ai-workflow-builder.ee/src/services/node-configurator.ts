/**
 * Shared Node Configuration Logic
 *
 * This module provides reusable configuration logic for:
 * - Parallel configuration workers (new workflow creation)
 * - Configurator subgraph (editing existing workflows)
 * - update_node_parameters tool (manual changes)
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
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

import { createParameterUpdaterChain } from '@/chains/parameter-updater';
import { ParameterUpdateError } from '@/errors';
import { trimWorkflowJSON } from '@/utils/trim-workflow-context';

import type { SimpleWorkflow } from '../types/workflow';
import type { DiscoveryContext } from '../types/discovery-types';
import type { ChatPayload } from '../workflow-builder-agent';

// ============================================================================
// Types
// ============================================================================

export interface NodeConfigurationContext {
	/** The node to configure */
	node: INode;
	/** The node type definition */
	nodeType: INodeTypeDescription;
	/** User's original request */
	userRequest: string;
	/** Discovery context with node info and available resources */
	discoveryContext?: DiscoveryContext | null;
	/** Current workflow JSON */
	workflow: SimpleWorkflow;
	/** Workflow execution context (sample data) */
	workflowContext?: ChatPayload['workflowContext'];
	/** Instance URL for webhooks */
	instanceUrl?: string;
}

export interface NodeConfigurationResult {
	/** Updated parameters for the node */
	parameters: INodeParameters;
	/** Changes that were applied (for logging) */
	appliedChanges: string[];
}

export interface ConfiguratorDependencies {
	llm: BaseChatModel;
	logger?: Logger;
}

// ============================================================================
// Property Filtering Logic
// ============================================================================

/**
 * Check if a property should be hidden based on a specific condition key.
 * Returns true if the property should be hidden, false otherwise.
 */
function isHiddenByCondition(
	displayOptions: INodeProperties['displayOptions'],
	conditionKey: string,
	value: string | number,
): boolean {
	const showCondition = displayOptions?.show?.[conditionKey];
	if (showCondition && !checkConditions(showCondition, [value])) {
		return true;
	}

	const hideCondition = displayOptions?.hide?.[conditionKey];
	if (hideCondition && checkConditions(hideCondition, [value])) {
		return true;
	}

	return false;
}

/**
 * Type guard for INodePropertyOptions.
 */
function isINodePropertyOptions(item: unknown): item is INodePropertyOptions {
	return (
		typeof item === 'object' &&
		item !== null &&
		'value' in item &&
		'name' in item &&
		!('values' in item)
	);
}

/**
 * Type guard for INodePropertyCollection.
 */
function isINodePropertyCollection(item: unknown): item is INodePropertyCollection {
	if (typeof item !== 'object' || item === null) return false;
	if (!('values' in item) || !('name' in item)) return false;
	return Array.isArray(item.values);
}

/**
 * Type guard for INodeProperties.
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

	if (type === 'options' || type === 'multiOptions') {
		const filteredOptions: INodePropertyOptions[] = [];
		for (const opt of options) {
			if (isINodePropertyOptions(opt)) {
				if (!isItemHiddenForContext(opt.displayOptions, nodeVersion, currentValues)) {
					filteredOptions.push(opt);
				}
			}
		}
		return { ...property, options: filteredOptions };
	}

	if (type === 'collection') {
		const filteredOptions: INodeProperties[] = [];
		for (const prop of options) {
			if (isINodeProperties(prop)) {
				if (!isItemHiddenForContext(prop.displayOptions, nodeVersion, currentValues)) {
					filteredOptions.push(filterPropertyRecursively(prop, nodeVersion, currentValues));
				}
			}
		}
		return { ...property, options: filteredOptions };
	}

	if (type === 'fixedCollection') {
		const filteredOptions: INodePropertyCollection[] = [];
		for (const coll of options) {
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
 */
function isPropertyVisibleForContext(
	property: INodeProperties,
	nodeVersion: number,
	currentValues: INodeParameters,
): boolean {
	const displayOptions = property.displayOptions;

	if (!displayOptions) {
		return true;
	}

	if (isHiddenByCondition(displayOptions, '@version', nodeVersion)) {
		return false;
	}

	const resource = currentValues.resource;
	const operation = currentValues.operation;

	if (typeof resource === 'string' && isHiddenByCondition(displayOptions, 'resource', resource)) {
		return false;
	}

	if (
		typeof operation === 'string' &&
		isHiddenByCondition(displayOptions, 'operation', operation)
	) {
		return false;
	}

	return true;
}

/**
 * Filter node properties based on the node's current context (version, resource, operation).
 * Exported for reuse by tools and workers.
 */
export function filterPropertiesForContext(
	properties: INodeProperties[],
	node: INode,
	currentValues: INodeParameters,
): INodeProperties[] {
	const nodeVersion = node.typeVersion;

	return properties
		.filter((property) => isPropertyVisibleForContext(property, nodeVersion, currentValues))
		.map((property) => filterPropertyRecursively(property, nodeVersion, currentValues));
}

// ============================================================================
// Configuration Logic
// ============================================================================

/**
 * Extract current parameters from a node, excluding internal n8n properties.
 */
export function extractNodeParameters(node: INode): INodeParameters {
	const { parameters } = node;
	if (!parameters) return {};

	// Filter out internal properties
	const filteredParams: INodeParameters = {};
	for (const [key, value] of Object.entries(parameters)) {
		if (!key.startsWith('__')) {
			filteredParams[key] = value;
		}
	}
	return filteredParams;
}

/**
 * Fix expression prefixes in parameters (e.g., ensure proper {{ }} wrapping).
 */
export function fixExpressionPrefixes(parameters: INodeParameters): INodeParameters {
	const result: INodeParameters = {};

	for (const [key, value] of Object.entries(parameters)) {
		if (typeof value === 'string') {
			// Fix common expression issues
			let fixed = value;
			// Ensure expressions have proper prefixes
			if (fixed.includes('$json') && !fixed.startsWith('={{') && !fixed.startsWith('=')) {
				fixed = `={{ ${fixed} }}`;
			}
			result[key] = fixed;
		} else if (typeof value === 'object' && value !== null) {
			result[key] = fixExpressionPrefixes(value as INodeParameters);
		} else {
			result[key] = value;
		}
	}

	return result;
}

/**
 * Generate configuration changes for a node based on context.
 * This is used by parallel workers to auto-generate what needs to be configured.
 */
export function generateConfigurationChanges(context: NodeConfigurationContext): string[] {
	const { node, nodeType, userRequest, discoveryContext } = context;
	const changes: string[] = [];

	// Find this node's info from discovery context
	const nodeDiscoveryInfo = discoveryContext?.nodesFound?.find((n) => n.nodeName === node.type);

	// Generate high-level change instruction based on user request and node type
	changes.push(
		`Configure "${node.name}" (${nodeType.displayName}) for the user's request: "${userRequest}"`,
	);

	// Add specific guidance based on node type category
	if (node.type.includes('Trigger')) {
		changes.push('Set up trigger conditions and any required polling intervals or webhooks');
	}

	if (node.type.includes('httpRequest')) {
		changes.push('Configure URL, method, headers, and body based on the API being called');
	}

	// If discovery found specific resources/operations, mention them
	if (nodeDiscoveryInfo?.availableResources?.length) {
		const resource = node.parameters?.resource;
		const operation = node.parameters?.operation;
		if (resource && operation) {
			changes.push(`Configure parameters for resource "${resource}" and operation "${operation}"`);
		}
	}

	return changes;
}

/**
 * Process parameter updates using the LLM chain.
 * Core configuration logic shared by tools and workers.
 */
export async function processNodeConfiguration(
	context: NodeConfigurationContext,
	changes: string[],
	deps: ConfiguratorDependencies,
): Promise<NodeConfigurationResult> {
	const { node, nodeType, workflow, workflowContext, instanceUrl } = context;
	const { llm, logger } = deps;

	// Get current parameters
	const currentParameters = extractNodeParameters(node);

	// Format changes for prompt
	const formattedChanges = changes.map((c, i) => `${i + 1}. ${c}`).join('\n');

	// Filter properties based on node's current context
	const currentValues = node.parameters ?? {};
	const filteredProperties = filterPropertiesForContext(
		nodeType.properties || [],
		node,
		currentValues,
	);
	const filteredPropertiesJson = JSON.stringify(filteredProperties, null, 2);

	logger?.debug('Processing node configuration', {
		nodeId: node.id,
		nodeType: node.type,
		nodeVersion: node.typeVersion,
		changesCount: changes.length,
		filteredPropertiesCount: filteredProperties.length,
	});

	// Create and invoke the parameter updater chain
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
		execution_schema: workflowContext?.executionSchema ?? 'NO SCHEMA',
		execution_data: workflowContext?.executionData ?? 'NO EXECUTION DATA YET',
		node_id: node.id,
		node_name: node.name,
		node_type: node.type,
		current_parameters: JSON.stringify(currentParameters, null, 2),
		node_definition: filteredPropertiesJson,
		changes: formattedChanges,
		instanceUrl: instanceUrl ?? '',
	})) as INodeParameters;

	// Validate response
	if (!newParameters || typeof newParameters !== 'object') {
		throw new ParameterUpdateError('Invalid parameters returned from LLM', {
			nodeId: node.id,
			nodeType: node.type,
		});
	}

	if (!newParameters.parameters || typeof newParameters.parameters !== 'object') {
		throw new ParameterUpdateError('Invalid parameters structure returned from LLM', {
			nodeId: node.id,
			nodeType: node.type,
		});
	}

	// Fix expression prefixes
	// Type assertion is safe here because we validated it's an object above
	const fixedParameters = fixExpressionPrefixes(newParameters.parameters as INodeParameters);

	return {
		parameters: fixedParameters,
		appliedChanges: changes,
	};
}

/**
 * Configure a single node for parallel workers.
 * Combines change generation and configuration in one call.
 */
export async function configureNode(
	context: NodeConfigurationContext,
	deps: ConfiguratorDependencies,
): Promise<NodeConfigurationResult> {
	// Generate changes based on context
	const changes = generateConfigurationChanges(context);

	// Process the configuration
	return processNodeConfiguration(context, changes, deps);
}
