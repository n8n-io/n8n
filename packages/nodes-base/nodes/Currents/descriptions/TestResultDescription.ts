import type { INodeProperties } from 'n8n-workflow';

export const testResultOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['testResult'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get historical test execution results for a specific test signature',
				routing: {
					request: {
						method: 'GET',
						url: '=/test-results/{{$parameter["signature"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
				action: 'Get test results',
			},
		],
		default: 'getAll',
	},
];

export const testResultFields: INodeProperties[] = [
	// ----------------------------------
	//         testResult:getAll
	// ----------------------------------
	{
		displayName: 'Test Signature',
		name: 'signature',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['testResult'],
				operation: ['getAll'],
			},
		},
		description:
			'The unique test signature. Use the Signature resource to generate this from project ID, spec file path, and test title.',
	},
	{
		displayName: 'Date Start',
		name: 'dateStart',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['testResult'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'date_start',
			},
		},
		description: 'Start date for results (ISO 8601 format)',
	},
	{
		displayName: 'Date End',
		name: 'dateEnd',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['testResult'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'date_end',
			},
		},
		description: 'End date for results (ISO 8601 format)',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['testResult'],
				operation: ['getAll'],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 10,
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['testResult'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Branches',
				name: 'branch',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'branch',
					},
				},
				description: 'Filter by git branch names (comma-separated for multiple)',
			},
			{
				displayName: 'Git Authors',
				name: 'gitAuthor',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'gitAuthor',
					},
				},
				description: 'Filter by git author names (comma-separated for multiple)',
			},
			{
				displayName: 'Groups',
				name: 'group',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'group',
					},
				},
				description: 'Filter by run groups (comma-separated for multiple)',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'multiOptions',
				options: [
					{ name: 'Failed', value: 'failed' },
					{ name: 'Passed', value: 'passed' },
					{ name: 'Pending', value: 'pending' },
					{ name: 'Skipped', value: 'skipped' },
				],
				default: [],
				routing: {
					send: {
						type: 'query',
						property: 'status',
					},
				},
				description: 'Filter by test status',
			},
			{
				displayName: 'Tags',
				name: 'tag',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'tag',
					},
				},
				description: 'Filter by run tags (comma-separated for multiple)',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['testResult'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Starting After',
				name: 'startingAfter',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'starting_after',
					},
				},
				description: 'Cursor for forward pagination',
			},
			{
				displayName: 'Ending Before',
				name: 'endingBefore',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'ending_before',
					},
				},
				description: 'Cursor for backward pagination',
			},
		],
	},
];
