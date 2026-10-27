import type {
	IDataObject,
	INodeProperties,
	INodeType,
	INodeTypeData,
	INodeTypes,
	IVersionedNodeType,
} from 'n8n-workflow';
import { NodeHelpers, UnexpectedError } from 'n8n-workflow';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';

/**
 * Builds a minimal `INodeTypes` for throwaway `Workflow` instances used to
 * resolve expressions. `nodesData` is the backing registry: callers may add
 * node types to it. Each call returns its own registry.
 */
export const createMockNodeTypes = () => {
	const nodesData: INodeTypeData = {
		mock: {
			sourcePath: '',
			type: {
				description: { properties: [] as INodeProperties[] },
			} as INodeType,
		},
	};

	const nodeTypes: INodeTypes = {
		getKnownTypes(): IDataObject {
			return {};
		},
		getByName(nodeType: string): INodeType | IVersionedNodeType {
			return nodesData[nodeType]?.type;
		},
		getByNameAndVersion(nodeType: string, version?: number): INodeType {
			if (!nodesData[nodeType]) {
				throw new UnexpectedError(RESPONSE_ERROR_MESSAGES.NO_NODE, {
					tags: { nodeType },
				});
			}
			return NodeHelpers.getVersionedNodeType(nodesData[nodeType].type, version);
		},
	};

	return { nodesData, nodeTypes };
};
