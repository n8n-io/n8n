import type { INode, INodeType, Workflow } from 'n8n-workflow';

export const TEST_EXECUTE_WORKFLOW_NODE: INode = {
	id: '1',
	type: 'n8n-nodes-base.executeWorkflow',
	name: 'Execute Workflow',
	typeVersion: 1.2,
	position: [-60, -120],
	parameters: {
		operation: 'call_workflow',
		source: 'database',
		workflowId: {
			__rl: true,
			mode: 'list',
			value: 'test123',
			cachedResultName: 'Child Workflow - Test',
		},
		mode: 'once',
		options: {},
	},
};

export const TEST_EXECUTE_WORKFLOW_NODE_WITH_EXPRESSION: INode = {
	...TEST_EXECUTE_WORKFLOW_NODE,
	parameters: {
		...TEST_EXECUTE_WORKFLOW_NODE.parameters,
		workflowId: {
			__rl: true,
			mode: 'json',
			value: '=test123',
		},
	},
};

export const MANUAL_TRIGGER_NODE: INode = {
	id: '2',
	name: 'Manual trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [-300, -120],
	parameters: { notice: '' },
};

export const TEST_WORKFLOW: Workflow = {
	id: '1',
	name: 'Test Workflow',
	active: false,
	nodes: {
		'Execute Workflow': TEST_EXECUTE_WORKFLOW_NODE,
		'Manual trigger': MANUAL_TRIGGER_NODE,
	},
	pinData: {},
	settings: { executionOrder: 'v1' },
	staticData: {},
	nodeTypes: {
		getByName: () => ({}) as INodeType,
		getByNameAndVersion: () => ({}) as INodeType,
		getKnownTypes: () => ({}),
	},
	// @ts-expect-error missing properties are not used in test
	expression: {
		workflow: {} as Workflow,
		convertObjectValueToString: vi.fn(),
		resolveSimpleParameterValue: vi.fn(),
		renderExpression: vi.fn(),
		getSimpleParameterValue: vi.fn(),
		getComplexParameterValue: vi.fn(),
		getParameterValue: vi.fn(),
	},
	timezone: 'UTC',
	testStaticData: {},
};

// @ts-expect-error missing properties are not used in test
export const TEST_WORKFLOW_WITH_EXPRESSION: Workflow = {
	...TEST_WORKFLOW,
	nodes: {
		'Execute Workflow': TEST_EXECUTE_WORKFLOW_NODE_WITH_EXPRESSION,
		'Manual trigger': MANUAL_TRIGGER_NODE,
	},
};
