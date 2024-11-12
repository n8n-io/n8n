import { type INode } from 'n8n-workflow';
import {
	AGENT_NODE_TYPE,
	BASIC_CHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	OPEN_AI_ASSISTANT_NODE_TYPE,
	OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE,
	QA_CHAIN_NODE_TYPE,
} from '@/constants';

const AI_NODES = [
	QA_CHAIN_NODE_TYPE,
	AGENT_NODE_TYPE,
	BASIC_CHAIN_NODE_TYPE,
	OPEN_AI_ASSISTANT_NODE_TYPE,
	OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE,
];

const MEMORY_NODE_NAMES = [
	'memoryBufferWindow',
	'memoryMotorhead',
	'memoryPostgresChat',
	'memoryRedisChat',
	'memoryXata',
	'memoryZep',
];

const PROMPT_PROVIDER_NODE_NAMES = [CHAT_TRIGGER_NODE_TYPE];

type NodeWithType = Pick<INode, 'type'>;

export function adjustNewlyConnectedNodes(parent: NodeWithType, child: NodeWithType) {
	if (!PROMPT_PROVIDER_NODE_NAMES.includes(child.type) && AI_NODES.includes(parent.type)) {
		Object.assign<NodeWithType, Partial<INode>>(child, {
			parameters: { promptType: 'define' },
		});
	}
	if (PROMPT_PROVIDER_NODE_NAMES.includes(parent.type) && MEMORY_NODE_NAMES.includes(child.type)) {
		Object.assign<NodeWithType, Partial<INode>>(child, {
			parameters: { sessionIdType: 'customKey' },
		});
	}
}
