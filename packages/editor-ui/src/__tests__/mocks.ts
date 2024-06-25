import type {
	INodeType,
	INodeTypeData,
	INodeTypes,
	IConnections,
	IDataObject,
	INode,
	IPinData,
	IWorkflowSettings,
	LoadedClass,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeHelpers, Workflow } from 'n8n-workflow';
import { uuid } from '@jsplumb/util';
import { mock } from 'vitest-mock-extended';

import {
	AGENT_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	CODE_NODE_TYPE,
	EXECUTABLE_TRIGGER_NODE_TYPES,
	MANUAL_TRIGGER_NODE_TYPE,
	NO_OP_NODE_TYPE,
	SET_NODE_TYPE,
} from '@/constants';

const mockNode = (name: string, type: string, props: Partial<INode> = {}) =>
	mock<INode>({ name, type, ...props });

const mockLoadedClass = (name: string) =>
	mock<LoadedClass<INodeType>>({
		type: mock<INodeType>({
			// @ts-expect-error
			description: mock<INodeTypeDescription>({
				name,
				displayName: name,
				version: 1,
				properties: [],
				group: EXECUTABLE_TRIGGER_NODE_TYPES.includes(name) ? ['trigger'] : [],
				inputs: ['main'],
				outputs: ['main'],
				documentationUrl: 'https://docs',
				webhooks: undefined,
			}),
		}),
	});

export const mockNodes = [
	mockNode('Manual Trigger', MANUAL_TRIGGER_NODE_TYPE),
	mockNode('Set', SET_NODE_TYPE),
	mockNode('Code', CODE_NODE_TYPE),
	mockNode('Rename', SET_NODE_TYPE),
	mockNode('Chat Trigger', CHAT_TRIGGER_NODE_TYPE),
	mockNode('Agent', AGENT_NODE_TYPE),
	mockNode('End', NO_OP_NODE_TYPE),
];

export const defaultNodeTypes = mockNodes.reduce<INodeTypeData>((acc, { type }) => {
	acc[type] = mockLoadedClass(type);
	return acc;
}, {});

export const defaultNodeDescriptions = Object.values(defaultNodeTypes).map(
	({ type }) => type.description,
) as INodeTypeDescription[];

const nodeTypes = mock<INodeTypes>({
	getByName(nodeType) {
		return defaultNodeTypes[nodeType].type;
	},
	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(defaultNodeTypes[nodeType].type, version);
	},
});

export function createTestWorkflowObject({
	id = uuid(),
	name = 'Test Workflow',
	nodes = [],
	connections = {},
	active = false,
	staticData = {},
	settings = {},
	pinData = {},
}: {
	id?: string;
	name?: string;
	nodes?: INode[];
	connections?: IConnections;
	active?: boolean;
	staticData?: IDataObject;
	settings?: IWorkflowSettings;
	pinData?: IPinData;
} = {}) {
	return new Workflow({
		id,
		name,
		nodes,
		connections,
		active,
		staticData,
		settings,
		pinData,
		nodeTypes,
	});
}

export function createTestNode(node: Partial<INode> = {}): INode {
	return {
		id: uuid(),
		name: 'Node',
		type: 'n8n-nodes-base.test',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
		...node,
	};
}
