import type { INodeTypeData, INodeTypeDescription } from 'n8n-workflow';
import {
	AGENT_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
} from '@/constants';
import { ManualTrigger } from '../../../nodes-base/dist/nodes/ManualTrigger/ManualTrigger.node';
import { ManualChatTrigger } from '../../../@n8n/nodes-langchain/nodes/trigger/ManualChatTrigger/ManualChatTrigger.node';
import { Agent } from '../../../@n8n/nodes-langchain/nodes/agents/Agent/Agent.node';

export const testingNodeTypes: INodeTypeData = {
	[MANUAL_TRIGGER_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: new ManualTrigger().description,
		},
	},
	[MANUAL_CHAT_TRIGGER_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: {
				...new ManualChatTrigger().description,
				name: MANUAL_CHAT_TRIGGER_NODE_TYPE,
			},
		},
	},
	[AGENT_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: {
				...new Agent().description,
				name: AGENT_NODE_TYPE,
			},
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
