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
		let groupKey = nodeType.name;

		if (nodeType.packageVersion) {
			groupKey = addPackageVersionToNodeTypeName(nodeType.name, nodeType.packageVersion);
		}

		if (newNodeVersions.length === 0) {
			const singleVersion = { [DEFAULT_NODETYPE_VERSION]: nodeType };

			groups[groupKey] = singleVersion;
			return groups;
		}

		for (const version of newNodeVersions) {
			// Node exists with the same name
			if (groups[groupKey]) {
				groups[groupKey][version] = Object.assign(groups[groupKey][version] ?? {}, nodeType);
			} else {
				groups[groupKey] = Object.assign(groups[groupKey] ?? {}, {
					[version]: nodeType,
				});
			}
		}

		return groups;
	}, {});

	return groupedNodeTypes;
}

export function addPackageVersionToNodeTypeName(fullNodeTypeName: string, packageVersion: string) {
	const [packageName, nodeTypeName] = fullNodeTypeName.split('.');
	if (['n8n-nodes-base', '@n8n/n8n-nodes-langchain'].includes(packageName)) return fullNodeTypeName;
	return `${packageName}@${packageVersion}.${nodeTypeName}`;
}
