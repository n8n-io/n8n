import type { INodeProperties } from 'n8n-workflow';

export const computeEnvironmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['computeEnvironment'],
			},
		},
		options: [
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about compute environments',
				action: 'Describe compute environments',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/describecomputeenvironments',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List compute environments',
				action: 'List compute environments',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/describecomputeenvironments',
					},
				},
			},
		],
		default: 'list',
	},
];

export const computeEnvironmentFields: INodeProperties[] = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['computeEnvironment'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'Compute Environments',
				name: 'computeEnvironments',
				type: 'string',
				default: '',
				description: 'Comma-separated list of compute environment names or ARNs',
				routing: {
					request: {
						body: {
							computeEnvironments: '={{ $value.split(",").map(v => v.trim()) }}',
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
				resource: ['computeEnvironment'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Maximum number of results',
				routing: {
					request: {
						body: {
							maxResults: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Next Token',
				name: 'nextToken',
				type: 'string',
				default: '',
				description: 'Pagination token',
				routing: {
					request: {
						body: {
							nextToken: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];
