import type { INodeProperties } from 'n8n-workflow';

export const stackOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['stack'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new stack',
				action: 'Create a stack',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'CreateStack',
							Version: '2010-05-15',
							StackName: '={{ $parameter["stackName"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a stack',
				action: 'Delete a stack',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DeleteStack',
							Version: '2010-05-15',
							StackName: '={{ $parameter["stackName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about stacks',
				action: 'Describe stacks',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeStacks',
							Version: '2010-05-15',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all stacks',
				action: 'List stacks',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'ListStacks',
							Version: '2010-05-15',
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a stack',
				action: 'Update a stack',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'UpdateStack',
							Version: '2010-05-15',
							StackName: '={{ $parameter["stackName"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const stackFields: INodeProperties[] = [
	{
		displayName: 'Stack Name',
		name: 'stackName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create', 'delete', 'update'],
			},
		},
		default: '',
		description: 'Name of the stack (1-128 characters)',
	},
	{
		displayName: 'Template Body',
		name: 'templateBody',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create'],
			},
		},
		default: '{"AWSTemplateFormatVersion":"2010-09-09","Description":"Simple template","Resources":{}}',
		description: 'CloudFormation template JSON or YAML (max 51200 bytes)',
		routing: {
			request: {
				qs: {
					TemplateBody: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Disable Rollback',
				name: 'disableRollback',
				type: 'boolean',
				default: false,
				description: 'Whether to disable rollback on creation failure',
				routing: {
					request: {
						qs: {
							DisableRollback: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Timeout In Minutes',
				name: 'timeoutInMinutes',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 43200,
				},
				default: 30,
				description: 'Stack creation timeout (1-43200 minutes)',
				routing: {
					request: {
						qs: {
							TimeoutInMinutes: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'On Failure',
				name: 'onFailure',
				type: 'options',
				options: [
					{ name: 'Do Nothing', value: 'DO_NOTHING' },
					{ name: 'Rollback', value: 'ROLLBACK' },
					{ name: 'Delete', value: 'DELETE' },
				],
				default: 'ROLLBACK',
				description: 'Action to take on creation failure',
				routing: {
					request: {
						qs: {
							OnFailure: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Enable Termination Protection',
				name: 'enableTerminationProtection',
				type: 'boolean',
				default: false,
				description: 'Whether to enable deletion protection',
				routing: {
					request: {
						qs: {
							EnableTerminationProtection: '={{ $value }}',
						},
					},
				},
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Template Body',
				name: 'templateBody',
				type: 'json',
				default: '',
				description: 'New CloudFormation template',
				routing: {
					request: {
						qs: {
							TemplateBody: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Use Previous Template',
				name: 'usePreviousTemplate',
				type: 'boolean',
				default: false,
				description: 'Whether to use the existing template',
				routing: {
					request: {
						qs: {
							UsePreviousTemplate: '={{ $value }}',
						},
					},
				},
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'Stack Name',
				name: 'stackName',
				type: 'string',
				default: '',
				description: 'Specific stack name to describe',
				routing: {
					request: {
						qs: {
							StackName: '={{ $value }}',
						},
					},
				},
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Next Token',
				name: 'nextToken',
				type: 'string',
				default: '',
				description: 'Pagination token from previous response',
				routing: {
					request: {
						qs: {
							NextToken: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];
