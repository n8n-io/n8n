import type { INodeProperties } from 'n8n-workflow';

export const crawlerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['crawler'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new crawler',
				action: 'Create a crawler',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.CreateCrawler',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a crawler',
				action: 'Delete a crawler',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.DeleteCrawler',
						},
						body: {
							Name: '={{ $parameter["crawlerName"] }}',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about a crawler',
				action: 'Get a crawler',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetCrawler',
						},
						body: {
							Name: '={{ $parameter["crawlerName"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all crawlers',
				action: 'List crawlers',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetCrawlers',
						},
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a crawler',
				action: 'Start a crawler',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.StartCrawler',
						},
						body: {
							Name: '={{ $parameter["crawlerName"] }}',
						},
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop a crawler',
				action: 'Stop a crawler',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.StopCrawler',
						},
						body: {
							Name: '={{ $parameter["crawlerName"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const crawlerFields: INodeProperties[] = [
	{
		displayName: 'Crawler Name',
		name: 'crawlerName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['crawler'],
				operation: ['create', 'get', 'delete', 'start', 'stop'],
			},
		},
		default: '',
		description: 'Name of the crawler',
	},
	{
		displayName: 'Database Name',
		name: 'databaseName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['crawler'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Target database name',
		routing: {
			request: {
				body: {
					DatabaseName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Role',
		name: 'role',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['crawler'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'IAM role ARN for the crawler',
		routing: {
			request: {
				body: {
					Name: '={{ $parameter["crawlerName"] }}',
					Role: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Targets',
		name: 'targets',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['crawler'],
				operation: ['create'],
			},
		},
		default: '{"S3Targets":[{"Path":"s3://my-bucket/data/"}]}',
		description: 'Crawler targets (S3, JDBC, DynamoDB, etc.)',
		routing: {
			request: {
				body: {
					Targets: '={{ JSON.parse($value) }}',
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
				resource: ['crawler'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
				description: 'Crawler description',
				routing: {
					request: {
						body: {
							Description: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Schedule',
				name: 'Schedule',
				type: 'string',
				default: '',
				description: 'Cron expression for schedule',
				routing: {
					request: {
						body: {
							Schedule: '={{ $value }}',
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
				resource: ['crawler'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'MaxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				default: 100,
				description: 'Maximum number of results',
				routing: {
					request: {
						body: {
							MaxResults: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Pagination token',
				routing: {
					request: {
						body: {
							NextToken: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];
