import {
	NodeConnectionTypes,
	type INode,
	type INodeProperties,
	type INodeTypeDescription,
} from 'n8n-workflow';

export const WORKFLOW_INPUTS_TEST_PARAMETER_PATH = 'parameters.workflowInputs';

export const WORKFLOW_INPUTS_TEST_PARAMETER: INodeProperties = {
	displayName: 'Workflow Inputs',
	name: 'workflowInputs',
	type: 'resourceMapper',
	noDataExpression: true,
	default: { mappingMode: 'defineBelow', value: null },
	required: true,
	typeOptions: {
		loadOptionsDependsOn: ['workflowId.value'],
		resourceMapper: {
			localResourceMapperMethod: 'loadWorkflowInputMappings',
			valuesLabel: 'Workflow Inputs',
			mode: 'map',
			fieldWords: { singular: 'input', plural: 'inputs' },
			addAllFields: true,
			multiKeyMatch: false,
			supportAutoMap: false,
			showTypeConversionOptions: false,
		},
	},
};

export const WORKFLOW_INPUTS_TEST_NODE: INode = {
	parameters: {
		operation: 'call_workflow',
		source: 'database',
		workflowId: {
			__rl: true,
			value: 'test123',
			mode: 'list',
			cachedResultName: 'Workflow inputs—test',
		},
		workflowInputs: {
			_custom: {
				type: 'reactive',
				stateTypeName: 'Reactive',
				value: {
					mappingMode: 'defineBelow',
					value: {},
					matchingColumns: [],
					schema: [
						{
							id: 'firstName',
							displayName: 'First Name',
							required: false,
							defaultMatch: false,
							display: true,
							canBeUsedToMatch: true,
							type: 'string',
						},
						{
							id: 'lastName',
							displayName: 'Last Name',
							required: false,
							defaultMatch: false,
							display: true,
							canBeUsedToMatch: true,
							type: 'string',
						},
					],
					attemptToConvertTypes: false,
					convertFieldsToString: true,
				},
			},
		},
		mode: 'once',
		options: {},
	},
	type: 'n8n-nodes-base.executeWorkflow',
	typeVersion: 1.2,
	position: [220, 0],
	id: 'test-123',
	name: 'Execute Workflow',
};

export const EXECUTE_WORKFLOW_NODE_TYPE_TEST: INodeTypeDescription = {
	displayName: 'Execute Sub-workflow',
	icon: 'fa:sign-in-alt',
	iconColor: 'orange-red',
	group: ['transform'],
	version: [1, 1.1, 1.2],
	subtitle: '={{"Workflow: " + $parameter["workflowId"]}}',
	description: 'Execute another workflow',
	defaults: { name: 'Execute Workflow', color: '#ff6d5a' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'hidden',
			noDataExpression: true,
			default: 'call_workflow',
			options: [{ name: 'Execute a Sub-Workflow', value: 'call_workflow' }],
		},
		{
			displayName: 'This node is out of date. Please upgrade by removing it and adding a new one',
			name: 'outdatedVersionWarning',
			type: 'notice',
			displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
			default: '',
		},
		{
			displayName: 'Source',
			name: 'source',
			type: 'options',
			options: [
				{
					name: 'Database',
					value: 'database',
					description: 'Load the workflow from the database by ID',
				},
				{
					name: 'Local File',
					value: 'localFile',
					description: 'Load the workflow from a locally saved file',
				},
				{
					name: 'Parameter',
					value: 'parameter',
					description: 'Load the workflow from a parameter',
				},
				{ name: 'URL', value: 'url', description: 'Load the workflow from an URL' },
			],
			default: 'database',
			description: 'Where to get the workflow to execute from',
			displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
		},
		{
			displayName: 'Source',
			name: 'source',
			type: 'options',
			options: [
				{
					name: 'Database',
					value: 'database',
					description: 'Load the workflow from the database by ID',
				},
				{
					name: 'Define Below',
					value: 'parameter',
					description: 'Pass the JSON code of a workflow',
				},
			],
			default: 'database',
			description: 'Where to get the workflow to execute from',
			displayOptions: { show: { '@version': [{ _cnd: { gte: 1.2 } }] } },
		},
		{
			displayName: 'Workflow ID',
			name: 'workflowId',
			type: 'string',
			displayOptions: { show: { source: ['database'], '@version': [1] } },
			default: '',
			required: true,
			hint: 'Can be found in the URL of the workflow',
			description:
				"Note on using an expression here: if this node is set to run once with all items, they will all be sent to the <em>same</em> workflow. That workflow's ID will be calculated by evaluating the expression for the <strong>first input item</strong>.",
		},
		{
			displayName: 'Workflow',
			name: 'workflowId',
			type: 'workflowSelector',
			displayOptions: { show: { source: ['database'], '@version': [{ _cnd: { gte: 1.1 } }] } },
			default: '',
			required: true,
			hint: "Note on using an expression here: if this node is set to run once with all items, they will all be sent to the <em>same</em> workflow. That workflow's ID will be calculated by evaluating the expression for the <strong>first input item</strong>.",
		},
		{
			displayName: 'Workflow Path',
			name: 'workflowPath',
			type: 'string',
			displayOptions: { show: { source: ['localFile'] } },
			default: '',
			placeholder: '/data/workflow.json',
			required: true,
			description: 'The path to local JSON workflow file to execute',
		},
		{
			displayName: 'Workflow JSON',
			name: 'workflowJson',
			type: 'json',
			typeOptions: { rows: 10 },
			displayOptions: { show: { source: ['parameter'] } },
			default: '\n\n\n',
			required: true,
			description: 'The workflow JSON code to execute',
		},
		{
			displayName: 'Workflow URL',
			name: 'workflowUrl',
			type: 'string',
			displayOptions: { show: { source: ['url'] } },
			default: '',
			placeholder: 'https://example.com/workflow.json',
			required: true,
			description: 'The URL from which to load the workflow from',
		},
		{
			displayName:
				'Any data you pass into this node will be output by the Execute Workflow Trigger. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/" target="_blank">More info</a>',
			name: 'executeWorkflowNotice',
			type: 'notice',
			default: '',
			displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
		},
		{
			displayName: 'Workflow Inputs',
			name: 'workflowInputs',
			type: 'resourceMapper',
			noDataExpression: true,
			default: { mappingMode: 'defineBelow', value: null },
			required: true,
			typeOptions: {
				loadOptionsDependsOn: ['workflowId.value'],
				resourceMapper: {
					localResourceMapperMethod: 'loadWorkflowInputMappings',
					valuesLabel: 'Workflow Inputs',
					mode: 'map',
					fieldWords: { singular: 'input', plural: 'inputs' },
					addAllFields: true,
					multiKeyMatch: false,
					supportAutoMap: false,
					showTypeConversionOptions: true,
				},
			},
			displayOptions: {
				show: { source: ['database'], '@version': [{ _cnd: { gte: 1.2 } }] },
				hide: { workflowId: [''] },
			},
		},
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Run once with all items',
					value: 'once',
					description: 'Pass all items into a single execution of the sub-workflow',
				},
				{
					name: 'Run once for each item',
					value: 'each',
					description: 'Call the sub-workflow individually for each item',
				},
			],
			default: 'once',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			default: {},
			placeholder: 'Add option',
			options: [
				{
					displayName: 'Wait For Sub-Workflow Completion',
					name: 'waitForSubWorkflow',
					type: 'boolean',
					default: true,
					description:
						'Whether the main workflow should wait for the sub-workflow to complete its execution before proceeding',
				},
			],
		},
	],
	codex: {
		categories: ['Core Nodes'],
		subcategories: { 'Core Nodes': ['Helpers', 'Flow'] },
		alias: ['n8n', 'call', 'sub', 'workflow', 'sub-workflow', 'subworkflow'],
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/',
				},
			],
		},
	},
	name: 'n8n-nodes-base.executeWorkflow',
};
