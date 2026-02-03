import type { INodeProperties } from 'n8n-workflow';

export const testOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['test'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get aggregated test metrics for a project',
				routing: {
					request: {
						method: 'GET',
						url: '=/tests/{{$parameter["projectId"]}}',
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
				action: 'Get many tests',
			},
		],
		default: 'getAll',
	},
];

export const testFields: INodeProperties[] = [
	// ----------------------------------
	//         test:getAll
	// ----------------------------------
	{
		displayName: 'Project',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getAll'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a project...',
				typeOptions: {
					searchListMethod: 'getProjects',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. abc123',
			},
		],
		description: 'The Currents project',
	},
	{
		displayName: 'Date Start',
		name: 'dateStart',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'date_start',
			},
		},
		description: 'Start date for metrics (ISO 8601 format)',
	},
	{
		displayName: 'Date End',
		name: 'dateEnd',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'date_end',
			},
		},
		description: 'End date for metrics (ISO 8601 format)',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getAll'],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 50,
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
				resource: ['test'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Authors',
				name: 'authors',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'author',
					},
				},
				description: 'Filter by git author names (comma-separated for multiple)',
			},
			{
				displayName: 'Branches',
				name: 'branches',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'branch',
					},
				},
				description: 'Filter by branch names (comma-separated for multiple)',
			},
			{
				displayName: 'Groups',
				name: 'groups',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'group',
					},
				},
				description: 'Filter by group names (comma-separated for multiple)',
			},
			{
				displayName: 'Minimum Executions',
				name: 'minExecutions',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				routing: {
					send: {
						type: 'query',
						property: 'min_executions',
					},
				},
				description: 'Minimum number of executions to include a test',
			},
			{
				displayName: 'Spec File',
				name: 'spec',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'spec',
					},
				},
				description: 'Filter tests by spec file name (partial match)',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'tag',
					},
				},
				description: 'Filter by tags (comma-separated for multiple)',
			},
			{
				displayName: 'Test State',
				name: 'testState',
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
						property: 'testState',
					},
				},
				description: 'Filter by test state',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'title',
					},
				},
				description: 'Filter tests by title (partial match)',
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
				resource: ['test'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Order By',
				name: 'order',
				type: 'options',
				options: [
					{ name: 'Duration', value: 'duration' },
					{ name: 'Duration Impact', value: 'durationXSamples' },
					{ name: 'Executions', value: 'executions' },
					{ name: 'Failure Impact', value: 'failRateXSamples' },
					{ name: 'Failure Rate Delta', value: 'failureRateDelta' },
					{ name: 'Failures', value: 'failures' },
					{ name: 'Flakiness', value: 'flakiness' },
					{ name: 'Flakiness Impact', value: 'flakinessXSamples' },
					{ name: 'Flakiness Rate Delta', value: 'flakinessRateDelta' },
					{ name: 'Passes', value: 'passes' },
					{ name: 'Title', value: 'title' },
				],
				default: 'title',
				routing: {
					send: {
						type: 'query',
						property: 'order',
					},
				},
				description: 'The field to order results by',
			},
			{
				displayName: 'Sort Direction',
				name: 'dir',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'desc',
				routing: {
					send: {
						type: 'query',
						property: 'dir',
					},
				},
				description: 'The direction to sort results',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				routing: {
					send: {
						type: 'query',
						property: 'page',
					},
				},
				description: 'Page number (0-indexed)',
			},
		],
	},
];
