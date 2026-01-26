import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

/**
 * Gets all versions supported by a node type.
 * If version is a single number, returns [version].
 * If version is an array, returns all versions.
 * Falls back to [1] if version is not a valid number/array.
 */
function getNodeTypeVersions(nodeType: INodeTypeDescription): number[] {
	const version = nodeType.version;

	if (typeof version === 'number') {
		return [version];
	}

	if (Array.isArray(version) && version.length > 0 && typeof version[0] === 'number') {
		return version;
	}

	// Default to version 1 if version is undefined, null, or not a valid type
	return [1];
}

/**
 * Gets the default version for a node type.
 * Uses defaultVersion if specified, otherwise the latest version in the array,
 * or 1 if no version information exists.
 */
function getDefaultVersion(nodeType: INodeTypeDescription): number {
	const defaultVersion = nodeType.defaultVersion;

	if (typeof defaultVersion === 'number') {
		return defaultVersion;
	}

	const versions = getNodeTypeVersions(nodeType);
	return Math.max(...versions);
}

/**
 * Creates a map for looking up node types by name and version.
 * The key format is `${nodeTypeName}-${version}`.
 *
 * Each node type is registered for all its supported versions.
 */
export function createNodeTypeMap(
	nodeTypes: INodeTypeDescription[],
): Map<string, INodeTypeDescription> {
	return new Map(
		nodeTypes.flatMap((nodeType) => {
			const versions = getNodeTypeVersions(nodeType);
			return versions.map((version) => [`${nodeType.name}-${version}`, nodeType] as const);
		}),
	);
}

/**
 * Resolves the version for a workflow node.
 * If the node has a typeVersion, uses that.
 * Otherwise, looks up the default version from the node type.
 * Falls back to 1 if the node type is not found.
 */
function resolveNodeVersion(
	node: SimpleWorkflow['nodes'][number],
	nodeTypesByName: Map<string, INodeTypeDescription>,
): number {
	if (node.typeVersion !== undefined) {
		return node.typeVersion;
	}

	const nodeType = nodeTypesByName.get(node.type);
	if (nodeType) {
		return getDefaultVersion(nodeType);
	}

	return 1;
}

/**
 * Gets the node type for a workflow node, considering the node's version.
 * Returns undefined if the exact version is not found.
 */
export function getNodeTypeForNode(
	node: SimpleWorkflow['nodes'][number],
	nodeTypeMap: Map<string, INodeTypeDescription>,
	nodeTypesByName: Map<string, INodeTypeDescription>,
): INodeTypeDescription | undefined {
	const version = resolveNodeVersion(node, nodeTypesByName);
	return nodeTypeMap.get(`${node.type}-${version}`);
}

/**
 * Creates both lookup maps needed for version-aware node type resolution.
 * Returns:
 * - nodeTypeMap: For looking up by name and version
 * - nodeTypesByName: For looking up by name only (used for default version resolution)
 */
export function createNodeTypeMaps(nodeTypes: INodeTypeDescription[]): {
	nodeTypeMap: Map<string, INodeTypeDescription>;
	nodeTypesByName: Map<string, INodeTypeDescription>;
} {
	// Convert to real array using Array.from (handles mock/proxy arrays in tests)
	const nodeTypesArray = Array.from(nodeTypes);
	const nodeTypeMap = createNodeTypeMap(nodeTypesArray);
	const nodeTypesByName = new Map<string, INodeTypeDescription>(
		nodeTypesArray.map((type) => [type.name, type] as const),
	);

	return { nodeTypeMap, nodeTypesByName };
}
