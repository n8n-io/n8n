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
	ITaskData,
	INodeProperties,
} from 'n8n-workflow';
import { FORM_TRIGGER_NODE_TYPE, NodeConnectionTypes, NodeHelpers, Workflow } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import {
	AGENT_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	CODE_NODE_TYPE,
	EXECUTABLE_TRIGGER_NODE_TYPES,
	MANUAL_TRIGGER_NODE_TYPE,
	NO_OP_NODE_TYPE,
	SET_NODE_TYPE,
	SIMULATE_NODE_TYPE,
	STICKY_NODE_TYPE,
} from '@/constants';
import type { IExecutionResponse, INodeUi, IWorkflowDb } from '@/Interface';
import { CanvasNodeRenderType } from '@/types';
import type { FrontendSettings } from '@n8n/api-types';
import type { ExpressionLocalResolveContext } from '@/types/expressions';

export const mockNode = ({
	id = uuid(),
	name,
	type,
	position = [0, 0],
	disabled = false,
	issues = undefined,
	typeVersion = 1,
	parameters = {},
	draggable = true,
}: {
	id?: INodeUi['id'];
	name: INodeUi['name'];
	type: INodeUi['type'];
	position?: INodeUi['position'];
	disabled?: INodeUi['disabled'];
	issues?: INodeIssues;
	typeVersion?: INodeUi['typeVersion'];
	parameters?: INodeUi['parameters'];
	draggable?: INodeUi['draggable'];
}) =>
	mock<INodeUi>({ id, name, type, position, disabled, issues, typeVersion, parameters, draggable });

export const mockNodeTypeDescription = ({
	name = SET_NODE_TYPE,
	displayName = name,
	icon = 'fa:pen',
	version = 1,
	credentials = [],
	inputs = [NodeConnectionTypes.Main],
	outputs = [NodeConnectionTypes.Main],
	codex = undefined,
	properties = [],
	group,
	hidden,
	description,
	webhooks,
	eventTriggerDescription,
}: Partial<INodeTypeDescription> = {}) =>
	mock<INodeTypeDescription>({
		name,
		icon,
		displayName,
		description: description ?? '',
		version,
		defaults: {
			name,
		},
		defaultVersion: Array.isArray(version) ? version[version.length - 1] : version,
		properties: properties as [],
		maxNodes: Infinity,
		group: (group ?? EXECUTABLE_TRIGGER_NODE_TYPES.includes(name)) ? ['trigger'] : [],
		inputs,
		outputs,
		codex,
		credentials,
		documentationUrl: 'https://docs',
		iconUrl: 'nodes/test-node/icon.svg',
		webhooks,
		parameterPane: undefined,
		hidden,
		eventTriggerDescription,
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
	mockNode({ name: 'Form Trigger', type: FORM_TRIGGER_NODE_TYPE }),
	mockNode({ name: 'Agent', type: AGENT_NODE_TYPE }),
	mockNode({ name: 'Sticky', type: STICKY_NODE_TYPE }),
	mockNode({ name: 'Simulate', type: SIMULATE_NODE_TYPE }),
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

export function createMockNodeTypes(data: INodeTypeData) {
	return mock<INodeTypes>({
		getByName(nodeType) {
			return data[nodeType].type;
		},
		getByNameAndVersion(nodeType: string, version?: number): INodeType {
			return NodeHelpers.getVersionedNodeType(data[nodeType].type, version);
		},
	});
}

const nodeTypes = createMockNodeTypes(defaultNodeTypes);

export function createTestWorkflowObject({
	id = uuid(),
	name = 'Test Workflow',
	nodes = [],
	connections = {},
	active = false,
	staticData = {},
	settings = {},
	pinData = {},
	...rest
}: {
	id?: string;
	name?: string;
	nodes?: INode[];
	connections?: IConnections;
	active?: boolean;
	staticData?: IDataObject;
	settings?: IWorkflowSettings;
	pinData?: IPinData;
	nodeTypes?: INodeTypes;
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
		nodeTypes: rest.nodeTypes ?? nodeTypes,
	});
}

export function createTestWorkflow({
	id = uuid(),
	name = 'Test Workflow',
	nodes = [],
	connections = {},
	active = false,
	isArchived = false,
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
		isArchived,
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

export function createTestNodeProperties(data: Partial<INodeProperties> = {}): INodeProperties {
	return {
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		...data,
	};
}

export function createMockEnterpriseSettings(
	overrides: Partial<FrontendSettings['enterprise']> = {},
): FrontendSettings['enterprise'] {
	return {
		sharing: false,
		ldap: false,
		saml: false,
		oidc: false,
		mfaEnforcement: false,
		logStreaming: false,
		advancedExecutionFilters: false,
		variables: false,
		sourceControl: false,
		auditLogs: false,
		externalSecrets: false,
		showNonProdBanner: false,
		debugInEditor: false,
		binaryDataS3: false,
		workflowHistory: false,
		workerView: false,
		advancedPermissions: false,
		apiKeyScopes: false,
		workflowDiffs: false,
		projects: {
			team: {
				limit: 0,
			},
		},
		...overrides, // Override with any passed properties
	};
}

export function createTestTaskData(partialData: Partial<ITaskData> = {}): ITaskData {
	return {
		startTime: 0,
		executionTime: 1,
		executionIndex: 0,
		source: [],
		executionStatus: 'success',
		data: { main: [[{ json: {} }]] },
		...partialData,
	};
}

export function createTestWorkflowExecutionResponse(
	data: Partial<IExecutionResponse> = {},
): IExecutionResponse {
	return {
		id: 'test-exec-id',
		finished: true,
		mode: 'manual',
		status: 'error',
		workflowData: createTestWorkflow(),
		data: {
			resultData: {
				runData: {},
			},
		},
		createdAt: '2025-04-16T00:00:00.000Z',
		startedAt: '2025-04-16T00:00:01.000Z',
		...data,
	};
}

export function createTestExpressionLocalResolveContext(
	data: Partial<ExpressionLocalResolveContext> = {},
): ExpressionLocalResolveContext {
	const workflow = data.workflow ?? createTestWorkflowObject();

	return {
		localResolve: true,
		workflow,
		nodeName: 'n0',
		inputNode: { name: 'n1', runIndex: 0, branchIndex: 0 },
		envVars: {},
		additionalKeys: {},
		connections: workflow.connectionsBySourceNode,
		execution: null,
		...data,
	};
}
