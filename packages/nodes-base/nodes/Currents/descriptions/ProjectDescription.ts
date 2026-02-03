import type { INodeProperties } from 'n8n-workflow';

export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['project'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a project by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{$parameter["projectId"]}}',
					},
				},
				action: 'Get a project',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many projects',
				routing: {
					request: {
						method: 'GET',
						url: '/projects',
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
				action: 'Get many projects',
			},
			{
				name: 'Get Insights',
				value: 'getInsights',
				description: 'Get project insights and metrics',
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{$parameter["projectId"]}}/insights',
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
				action: 'Get project insights',
			},
		],
		default: 'getAll',
	},
];

export const projectFields: INodeProperties[] = [
	// ----------------------------------
	//         project:get
	// ----------------------------------
	{
		displayName: 'Project',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['get', 'getInsights'],
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

	// ----------------------------------
	//         project:getAll
	// ----------------------------------
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['getAll'],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
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

	// ----------------------------------
	//         project:getInsights
	// ----------------------------------
	{
		displayName: 'Date Start',
		name: 'dateStart',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['getInsights'],
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
				resource: ['project'],
				operation: ['getInsights'],
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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['getInsights'],
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
				description: 'Filter by commit author names (comma-separated)',
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
				description: 'Filter by branch names (comma-separated)',
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
				description: 'Filter by group names (comma-separated)',
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'options',
				options: [
					{ name: '1 Hour', value: '1h' },
					{ name: '1 Day', value: '1d' },
					{ name: '1 Week', value: '1w' },
				],
				default: '1d',
				routing: {
					send: {
						type: 'query',
						property: 'resolution',
					},
				},
				description: 'Time resolution for metrics',
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
				description: 'Filter by tags (comma-separated)',
			},
		],
	},
];
