import type { INodeProperties } from 'n8n-workflow';

export const activityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['activity'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new activity',
				action: 'Create an activity',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.CreateActivity',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an activity',
				action: 'Delete an activity',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.DeleteActivity',
						},
						body: {
							activityArn: '={{ $parameter["activityArn"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about an activity',
				action: 'Describe an activity',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.DescribeActivity',
						},
						body: {
							activityArn: '={{ $parameter["activityArn"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all activities',
				action: 'List activities',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.ListActivities',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const activityFields: INodeProperties[] = [
	{
		displayName: 'Activity ARN',
		name: 'activityArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['describe', 'delete'],
			},
		},
		default: '',
		description: 'The ARN of the activity',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the activity (1-80 characters)',
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
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
				resource: ['activity'],
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
					maxValue: 1000,
				},
				default: 100,
				description: 'Maximum number of results to return',
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
				description: 'Pagination token from previous response',
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
