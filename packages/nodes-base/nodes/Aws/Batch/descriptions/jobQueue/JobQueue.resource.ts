import type { INodeProperties } from 'n8n-workflow';

export const jobQueueOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['jobQueue'],
			},
		},
		options: [
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about job queues',
				action: 'Describe job queues',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/describejobqueues',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List job queues',
				action: 'List job queues',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/describejobqueues',
					},
				},
			},
		],
		default: 'list',
	},
];

export const jobQueueFields: INodeProperties[] = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['jobQueue'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'Job Queues',
				name: 'jobQueues',
				type: 'string',
				default: '',
				description: 'Comma-separated list of job queue names or ARNs',
				routing: {
					request: {
						body: {
							jobQueues: '={{ $value.split(",").map(v => v.trim()) }}',
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
				resource: ['jobQueue'],
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
