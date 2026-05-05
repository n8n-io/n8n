import { ERROR_TRIGGER_NODE_TYPE } from '@/app/constants';
import type { NodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeType, INodeTypes } from 'n8n-workflow';

export function createFrontendNodeTypes(
	nodeTypesStore: Pick<NodeTypesStore, 'getNodeType' | 'communityNodeType'>,
): INodeTypes {
	const nodeTypes: INodeTypes = {
		nodeTypes: {},
		init: async (): Promise<void> => {},
		getByNameAndVersion: (nodeType: string, version?: number): INodeType | undefined => {
			const nodeTypeDescription =
				nodeTypesStore.getNodeType(nodeType, version) ??
				nodeTypesStore.communityNodeType(nodeType)?.nodeDescription ??
				null;
			if (nodeTypeDescription === null) {
				return undefined;
			}

			return {
				description: nodeTypeDescription,
				// As we do not have the trigger/poll functions available in the frontend
				// we use the information available to figure out what are trigger nodes
				// @ts-ignore
				trigger:
					(![ERROR_TRIGGER_NODE_TYPE].includes(nodeType) &&
						nodeTypeDescription.inputs.length === 0 &&
						!nodeTypeDescription.webhooks) ||
					undefined,
			};
		},
	} as unknown as INodeTypes;

	return nodeTypes;
}
