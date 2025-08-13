import type { INodeType, INodeTypes, INodeTypeDescription } from 'n8n-workflow';
import { ERROR_TRIGGER_NODE_TYPE, START_NODE_TYPE } from '@/constants';

export function createNodeTypes(nodeTypes: Record<string, INodeType>) {
	function getNodeType(nodeTypeName: string, version?: number): INodeTypeDescription | null {
		// @TODO Currently unsupported node types
		// if (nodeTypeUtils.isCredentialOnlyNodeType(nodeTypeName)) {
		// 	return getCredentialOnlyNodeType.value(nodeTypeName, version);
		// }

		if (!nodeTypes) {
			return null;
		}

		const nodeVersions = nodeTypes[nodeTypeName];

		if (!nodeVersions) return null;

		const versionNumbers = Object.keys(nodeVersions).map(Number);
		const nodeType = nodeVersions[version ?? Math.max(...versionNumbers)];
		return nodeType ?? null;
	}

	return {
		nodeTypes,
		init: async (): Promise<void> => {},
		getByNameAndVersion: (nodeType: string, version?: number): INodeType | undefined => {
			const nodeTypeDescription = getNodeType(nodeType, version);

			if (nodeTypeDescription === null) {
				return undefined;
			}

			return {
				description: nodeTypeDescription,
				// As we do not have the trigger/poll functions available in the frontend
				// we use the information available to figure out what are trigger nodes
				// @ts-ignore
				trigger:
					(![ERROR_TRIGGER_NODE_TYPE, START_NODE_TYPE].includes(nodeType) &&
						nodeTypeDescription.inputs.length === 0 &&
						!nodeTypeDescription.webhooks) ||
					undefined,
			};
		},
	} as INodeTypes;
}
