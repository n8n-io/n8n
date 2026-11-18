import type { INode, INodePropertyOptions, INodePropertyTypeOptions } from 'n8n-workflow';

type ConnectedNodesConfig = NonNullable<INodePropertyTypeOptions['optionsFromConnectedNodes']>;

interface ConnectedNodeLookups {
	getParentNodes: (
		nodeName: string,
		type: ConnectedNodesConfig['connectionType'],
		depth: number,
	) => string[];
	getNodeByName: (name: string) => INode | null | undefined;
	getNodeTypeDisplayName: (type: string, version: number) => string | undefined;
}

/**
 * Options for a parameter with `optionsFromConnectedNodes`: the nodes connected
 * directly to `nodeName` on the given input, or their distinct node types.
 * The backend cannot build this list, because it loads options without the
 * workflow's connections.
 */
export function getConnectedNodeOptions(
	nodeName: string,
	config: ConnectedNodesConfig,
	lookups: ConnectedNodeLookups,
): INodePropertyOptions[] {
	const names = lookups.getParentNodes(nodeName, config.connectionType, 1);

	if (config.value === 'nodeName') {
		return names
			.map((name) => ({ name, value: name }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	const byType = new Map<string, INodePropertyOptions>();
	for (const name of names) {
		const node = lookups.getNodeByName(name);
		if (!node || byType.has(node.type)) continue;
		const displayName = lookups.getNodeTypeDisplayName(node.type, node.typeVersion) ?? node.type;
		byType.set(node.type, { name: displayName, value: node.type });
	}
	return [...byType.values()].sort((a, b) => a.name.localeCompare(b.name));
}
