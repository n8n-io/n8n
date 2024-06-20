import { type INodeTypeDescription } from 'n8n-workflow';
import type { NodeTypesByTypeNameAndVersion } from '@/Interface';
import { DEFAULT_NODETYPE_VERSION } from '@/constants';
import type { NodeTypesStore } from '@/stores/nodeTypes.store';

export type NodeTypeProvider = Pick<NodeTypesStore, 'getNodeType'>;

export function getNodeVersions(nodeType: INodeTypeDescription) {
	return Array.isArray(nodeType.version) ? nodeType.version : [nodeType.version];
}

/**
 * Groups given node types by their name and version
 *
 * @example
 * const nodeTypes = [
 * 	{ name: 'twitter', version: '1', ... },
 * 	{ name: 'twitter', version: '2', ... },
 * ]
 *
 * const groupedNodeTypes = groupNodeTypesByNameAndType(nodeTypes);
 * // {
 * // 	twitter: {
 * // 		1: { name: 'twitter', version: '1', ... },
 * // 		2: { name: 'twitter', version: '2', ... },
 * // 	}
 * // }
 */
export function groupNodeTypesByNameAndType(
	nodeTypes: INodeTypeDescription[],
): NodeTypesByTypeNameAndVersion {
	const groupedNodeTypes = nodeTypes.reduce<NodeTypesByTypeNameAndVersion>((groups, nodeType) => {
		const newNodeVersions = getNodeVersions(nodeType);

		if (newNodeVersions.length === 0) {
			const singleVersion = { [DEFAULT_NODETYPE_VERSION]: nodeType };

			groups[nodeType.name] = singleVersion;
			return groups;
		}

		for (const version of newNodeVersions) {
			// Node exists with the same name
			if (groups[nodeType.name]) {
				groups[nodeType.name][version] = Object.assign(
					groups[nodeType.name][version] ?? {},
					nodeType,
				);
			} else {
				groups[nodeType.name] = Object.assign(groups[nodeType.name] ?? {}, {
					[version]: nodeType,
				});
			}
		}

		return groups;
	}, {});

	return groupedNodeTypes;
}
