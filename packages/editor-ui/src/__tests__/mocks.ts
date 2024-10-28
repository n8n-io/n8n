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

export const mockNode = ({
	id = uuid(),
	name,
	type,
	position = [0, 0],
	disabled = false,
}: {
	id?: INode['id'];
	name: INode['name'];
	type: INode['type'];
	position?: INode['position'];
	disabled?: INode['disabled'];
}) => mock<INode>({ id, name, type, position, disabled });

export const mockNodeTypeDescription = ({
	name,
	version = 1,
	credentials = [],
}: {
	name: INodeTypeDescription['name'];
	version?: INodeTypeDescription['version'];
	credentials?: INodeTypeDescription['credentials'];
}) =>
	mock<INodeTypeDescription>({
		name,
		displayName: name,
		version,
		defaults: {
			name,
		},
		defaultVersion: Array.isArray(version) ? version[version.length - 1] : version,
		properties: [],
		maxNodes: Infinity,
		group: EXECUTABLE_TRIGGER_NODE_TYPES.includes(name) ? ['trigger'] : [],
		inputs: ['main'],
		outputs: ['main'],
		credentials,
		documentationUrl: 'https://docs',
		webhooks: undefined,
	});

export const mockLoadedNodeType = (name: string) =>
	mock<LoadedClass<INodeType>>({
		type: mock<INodeType>({
			// @ts-expect-error
			description: mockNodeTypeDescription({ name }),
		}),
	});

export const mockNodes = [
	mockNode({ name: 'Manual Trigger', type: MANUAL_TRIGGER_NODE_TYPE }),
	mockNode({ name: 'Set', type: SET_NODE_TYPE }),
	mockNode({ name: 'Code', type: CODE_NODE_TYPE }),
	mockNode({ name: 'Rename', type: SET_NODE_TYPE }),
	mockNode({ name: 'Chat Trigger', type: CHAT_TRIGGER_NODE_TYPE }),
	mockNode({ name: 'Agent', type: AGENT_NODE_TYPE }),
	mockNode({ name: 'End', type: NO_OP_NODE_TYPE }),
];

export const defaultNodeTypes = mockNodes.reduce<INodeTypeData>((acc, { type }) => {
	acc[type] = mockLoadedNodeType(type);
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
