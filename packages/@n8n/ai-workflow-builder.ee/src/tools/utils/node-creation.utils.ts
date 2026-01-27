import {
	assert,
	type INode,
	type INodeProperties,
	type INodeTypeDescription,
	type NodeParameterValueType,
} from 'n8n-workflow';

/**
 * Extract default parameter values from node type properties.
 *
 * This extracts top-level defaults from the node type definition to ensure
 * newly created nodes have sensible starting values. Only includes parameters
 * that have explicit defaults and don't require complex display conditions.
 *
 * @param nodeType - The node type description
 * @returns An object with default parameter values
 */
export function extractDefaultParameters(
	nodeType: INodeTypeDescription,
): Record<string, NodeParameterValueType> {
	const defaults: Record<string, NodeParameterValueType> = {};

	if (!nodeType.properties) {
		return defaults;
	}

	for (const property of nodeType.properties) {
		// Skip if no default value defined
		if (property.default === undefined) {
			continue;
		}

		// Skip if the property has display options that depend on other parameters
		// These conditional parameters should only be set when their conditions are met
		if (hasParameterDependentDisplayOptions(property)) {
			continue;
		}

		// Include the default value
		// Note: We include empty strings and false as they're valid defaults
		defaults[property.name] = property.default as NodeParameterValueType;
	}

	return defaults;
}

/**
 * System-level displayOptions keys that are NOT parameter dependencies.
 * These keys control property visibility based on system conditions (like version)
 * rather than depending on other parameter values.
 */
const SYSTEM_DISPLAY_OPTION_KEYS = new Set(['@version']);

/**
 * Check if a property has displayOptions that depend on other parameters.
 * Properties with such conditions should not have defaults auto-applied
 * as they may not be relevant in all contexts.
 *
 * Note: System-level conditions like '@version' are NOT considered parameter
 * dependencies. Properties with only version-based displayOptions will still
 * have their defaults extracted.
 */
function hasParameterDependentDisplayOptions(property: INodeProperties): boolean {
	if (!property.displayOptions) {
		return false;
	}

	const { show, hide } = property.displayOptions;

	// Check if show conditions reference actual parameters (not system keys like @version)
	if (show) {
		const parameterDependentKeys = Object.keys(show).filter(
			(key) => !SYSTEM_DISPLAY_OPTION_KEYS.has(key),
		);
		if (parameterDependentKeys.length > 0) {
			return true;
		}
	}

	// Check if hide conditions reference actual parameters
	if (hide) {
		const parameterDependentKeys = Object.keys(hide).filter(
			(key) => !SYSTEM_DISPLAY_OPTION_KEYS.has(key),
		);
		if (parameterDependentKeys.length > 0) {
			return true;
		}
	}

	return false;
}

/**
 * Generate a unique node name by appending numbers if necessary
 * @param baseName - The base name to start with
 * @param existingNodes - Array of existing nodes to check against
 * @returns A unique node name
 */
export function generateUniqueName(baseName: string, existingNodes: INode[]): string {
	let uniqueName = baseName;
	let counter = 1;

	while (existingNodes.some((n) => n.name === uniqueName)) {
		uniqueName = `${baseName}${counter}`;
		counter++;
	}

	return uniqueName;
}

/**
 * Get the latest version number for a node type
 * @param nodeType - The node type description
 * @returns The latest version number
 */
export function getLatestVersion(nodeType: INodeTypeDescription): number {
	return (
		nodeType.defaultVersion ??
		(typeof nodeType.version === 'number'
			? nodeType.version
			: nodeType.version[nodeType.version.length - 1])
	);
}

/**
 * Generate a unique node ID
 * @returns A unique node identifier
 */
export function generateNodeId(): string {
	return crypto.randomUUID();
}

/**
 * Generate a webhook ID for nodes that require it
 * @returns A unique webhook identifier
 */
export function generateWebhookId(): string {
	return crypto.randomUUID();
}

/**
 * Check if a node type requires a webhook
 * @param nodeType - The node type description
 * @returns True if the node requires a webhook
 */
export function requiresWebhook(nodeType: INodeTypeDescription): boolean {
	return !!(nodeType.webhooks && nodeType.webhooks.length > 0);
}

/**
 * Create a new node instance with all required properties.
 *
 * Default parameters from the node type definition are automatically applied,
 * then any explicitly provided parameters are merged on top.
 *
 * @param nodeType - The node type description
 * @param typeVersion - The node type version - nodeType can have multiple versions
 * @param name - The name for the node
 * @param position - The position of the node
 * @param parameters - Optional parameters for the node (merged on top of defaults)
 * @param id - Optional specific ID to use for the node (for testing purposes)
 * @returns A complete node instance
 */
export function createNodeInstance(
	nodeType: INodeTypeDescription,
	typeVersion: number,
	name: string,
	position: [number, number],
	parameters: Record<string, NodeParameterValueType> = {},
	id?: string,
): INode {
	assert(
		Array.isArray(nodeType.version)
			? nodeType.version.includes(typeVersion)
			: typeVersion === nodeType.version,
	);

	// Extract default parameters from node type definition
	const defaultParams = extractDefaultParameters(nodeType);

	// Merge: defaults first, then explicit parameters override
	const mergedParameters = { ...defaultParams, ...parameters };

	const node: INode = {
		id: id ?? generateNodeId(),
		name,
		type: nodeType.name,
		typeVersion,
		position,
		parameters: mergedParameters,
	};

	// Add webhook ID if required
	if (requiresWebhook(nodeType)) {
		node.webhookId = generateWebhookId();
	}

	return node;
}

/**
 * Merge provided parameters with node defaults
 * @param parameters - User-provided parameters
 * @param nodeType - The node type description
 * @returns Merged parameters
 */
export function mergeWithDefaults(
	parameters: Record<string, NodeParameterValueType>,
	nodeType: INodeTypeDescription,
): Record<string, NodeParameterValueType> {
	const defaults = nodeType.defaults || {};
	return { ...defaults, ...parameters };
}
