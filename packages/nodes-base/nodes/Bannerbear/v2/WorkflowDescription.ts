import type { INodeProperties } from 'n8n-workflow';

export const workflowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a workflow definition',
				action: 'Get a workflow',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many workflows',
				action: 'Get many workflows',
			},
			{
				name: 'Run',
				value: 'run',
				description: 'Start a workflow run',
				action: 'Run a workflow',
			},
		],
		default: 'run',
	},
];

export const workflowFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                            workflow:run / get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workflow Name or ID',
		name: 'workflowId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkflows',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['run', 'get'],
			},
		},
		description:
			'The workflow to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Inputs',
		name: 'inputsUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Input',
		default: {},
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['run'],
			},
		},
		options: [
			{
				displayName: 'Input',
				name: 'inputValues',
				values: [
					{
						displayName: 'Name or ID',
						name: 'name',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getWorkflowInputs',
							loadOptionsDependsOn: ['workflowId'],
						},
						default: '',
						description:
							'An input the workflow declares. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to pass for this input',
					},
				],
			},
		],
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['run'],
			},
		},
		description:
			'Whether to poll until the run finishes. Most workflows take minutes, which is longer than a single execution should wait, so leaving this off returns the queued run and lets a later step fetch the result.',
	},
	{
		displayName: 'Max Tries',
		name: 'maxTries',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 300,
		},
		default: 30,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['run'],
				waitForCompletion: [true],
			},
		},
		description: 'How many times to check the run before giving up, at two seconds apart',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];

export const workflowRunOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['workflowRun'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a workflow run',
				action: 'Get a workflow run',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many workflow runs',
				action: 'Get many workflow runs',
			},
		],
		default: 'get',
	},
];

export const workflowRunFields: INodeProperties[] = [
	{
		displayName: 'Workflow Run ID',
		name: 'workflowRunId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['workflowRun'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier returned when the run was started',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['workflowRun'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		displayOptions: {
			show: {
				resource: ['workflowRun'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
