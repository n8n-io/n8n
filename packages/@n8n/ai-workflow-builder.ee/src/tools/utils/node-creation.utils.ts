import type { INode, INodeTypeDescription, NodeParameterValueType } from 'n8n-workflow';

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
 * Create a new node instance with all required properties
 * @param nodeType - The node type description
 * @param name - The name for the node
 * @param position - The position of the node
 * @param parameters - Optional parameters for the node
 * @returns A complete node instance
 */
export function createNodeInstance(
	nodeType: INodeTypeDescription,
	name: string,
	position: [number, number],
	parameters: Record<string, NodeParameterValueType> = {},
): INode {
	const node: INode = {
		id: generateNodeId(),
		name,
		type: nodeType.name,
		typeVersion: getLatestVersion(nodeType),
		position,
		parameters,
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
