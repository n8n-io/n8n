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
	INodeIssues,
} from 'n8n-workflow';
import { NodeConnectionType, NodeHelpers, Workflow } from 'n8n-workflow';
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
	STICKY_NODE_TYPE,
} from '@/constants';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { CanvasNodeRenderType } from '@/types';

export const mockNode = ({
	id = uuid(),
	name,
	type,
	position = [0, 0],
	disabled = false,
	issues = undefined,
	typeVersion = 1,
	parameters = {},
}: {
	id?: INodeUi['id'];
	name: INodeUi['name'];
	type: INodeUi['type'];
	position?: INodeUi['position'];
	disabled?: INodeUi['disabled'];
	issues?: INodeIssues;
	typeVersion?: INodeUi['typeVersion'];
	parameters?: INodeUi['parameters'];
}) => mock<INodeUi>({ id, name, type, position, disabled, issues, typeVersion, parameters });

export const mockNodeTypeDescription = ({
	name = SET_NODE_TYPE,
	version = 1,
	credentials = [],
	inputs = [NodeConnectionType.Main],
	outputs = [NodeConnectionType.Main],
}: {
	name?: INodeTypeDescription['name'];
	version?: INodeTypeDescription['version'];
	credentials?: INodeTypeDescription['credentials'];
	inputs?: INodeTypeDescription['inputs'];
	outputs?: INodeTypeDescription['outputs'];
} = {}) =>
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
		inputs,
		outputs,
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
	mockNode({ name: 'Sticky', type: STICKY_NODE_TYPE }),
	mockNode({ name: CanvasNodeRenderType.AddNodes, type: CanvasNodeRenderType.AddNodes }),
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

export function createTestWorkflow({
	id = uuid(),
	name = 'Test Workflow',
	nodes = [],
	connections = {},
	active = false,
	settings = {
		timezone: 'DEFAULT',
		executionOrder: 'v1',
	},
	pinData = {},
	...rest
}: Partial<IWorkflowDb> = {}): IWorkflowDb {
	return {
		createdAt: '',
		updatedAt: '',
		id,
		name,
		nodes,
		connections,
		active,
		settings,
		versionId: '1',
		meta: {},
		pinData,
		...rest,
	};
}

export function createTestNode(node: Partial<INode> = {}): INode {
	return {
		id: uuid(),
		name: 'Node',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
		...node,
	};
}
