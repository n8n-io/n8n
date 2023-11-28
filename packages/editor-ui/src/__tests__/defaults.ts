import type { INodeTypeData, INodeTypeDescription } from 'n8n-workflow';
import {
	AGENT_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
} from '@/constants';
import nodeTypesJson from '../../../nodes-base/dist/types/nodes.json';

const allNodeTypes = [...nodeTypesJson];

function findNodeWithName(name: string): INodeTypeDescription {
	return allNodeTypes.find((node) => node.name === name) as INodeTypeDescription;
}

export const testingNodeTypes: INodeTypeData = {
	[MANUAL_TRIGGER_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: findNodeWithName(MANUAL_TRIGGER_NODE_TYPE),
		},
	},
	[MANUAL_CHAT_TRIGGER_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: findNodeWithName(MANUAL_CHAT_TRIGGER_NODE_TYPE),
		},
	},
	[AGENT_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: findNodeWithName(AGENT_NODE_TYPE),
		},
	},
};

export const defaultMockNodeTypes: INodeTypeData = {
	[MANUAL_TRIGGER_NODE_TYPE]: testingNodeTypes[MANUAL_TRIGGER_NODE_TYPE],
};

export function mockNodeTypesToArray(nodeTypes: INodeTypeData): INodeTypeDescription[] {
	return Object.values(nodeTypes).map(
		(nodeType) => nodeType.type.description as INodeTypeDescription,
	);
}

export const defaultMockNodeTypesArray: INodeTypeDescription[] =
	mockNodeTypesToArray(defaultMockNodeTypes);
