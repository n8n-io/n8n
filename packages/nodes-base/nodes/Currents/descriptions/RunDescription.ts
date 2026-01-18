import type { INodeProperties } from 'n8n-workflow';

export const runOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['run'],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a run in progress',
				routing: {
					request: {
						method: 'PUT',
						url: '=/runs/{{$parameter["runId"]}}/cancel',
					},
				},
				action: 'Cancel a run',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a run and all associated data',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/runs/{{$parameter["runId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}',
								},
							},
						],
					},
				},
				action: 'Delete a run',
			},
			{
				name: 'Find',
				value: 'find',
				description: 'Find a run by project and filters',
				routing: {
					request: {
						method: 'GET',
						url: '/runs/find',
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
				action: 'Find a run',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a run by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/runs/{{$parameter["runId"]}}',
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
				action: 'Get a run',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many runs for a project',
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{$parameter["projectId"]}}/runs',
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
				action: 'Get many runs',
			},
		],
		default: 'getAll',
	},
];

export const runFields: INodeProperties[] = [
	// ----------------------------------
	//         run:get, cancel, delete
	// ----------------------------------
	{
		displayName: 'Run ID',
		name: 'runId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['get', 'cancel', 'delete'],
			},
		},
		description: 'The ID of the run',
	},

	// ----------------------------------
	//         run:find
	// ----------------------------------
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['find', 'getAll'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'projectId',
			},
		},
		description: 'The ID of the project',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['find'],
			},
		},
		options: [
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'branch',
					},
				},
				description: 'Filter by git branch name',
			},
			{
				displayName: 'CI Build ID',
				name: 'ciBuildId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'ciBuildId',
					},
				},
				description: 'Filter by CI build ID',
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'tag',
					},
				},
				description: 'Filter by tag',
			},
		],
	},

	// ----------------------------------
	//         run:getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['getAll'],
				returnAll: [false],
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
				resource: ['run'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'branch',
					},
				},
				description: 'Filter by git branch name',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'multiOptions',
				options: [
					{ name: 'Failed', value: 'FAILED' },
					{ name: 'Failing', value: 'FAILING' },
					{ name: 'Passed', value: 'PASSED' },
					{ name: 'Running', value: 'RUNNING' },
				],
				default: [],
				routing: {
					send: {
						type: 'query',
						property: 'status',
					},
				},
				description: 'Filter by run status',
			},
			{
				displayName: 'Completion State',
				name: 'completionState',
				type: 'multiOptions',
				options: [
					{ name: 'Canceled', value: 'CANCELED' },
					{ name: 'Complete', value: 'COMPLETE' },
					{ name: 'In Progress', value: 'IN_PROGRESS' },
					{ name: 'Timeout', value: 'TIMEOUT' },
				],
				default: [],
				routing: {
					send: {
						type: 'query',
						property: 'completion_state',
					},
				},
				description: 'Filter by completion state',
			},
			{
				displayName: 'Date Start',
				name: 'dateStart',
				type: 'dateTime',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'date_start',
					},
				},
				description: 'Filter runs created on or after this date',
			},
			{
				displayName: 'Date End',
				name: 'dateEnd',
				type: 'dateTime',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'date_end',
					},
				},
				description: 'Filter runs created before this date',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'search',
					},
				},
				description: 'Search by ciBuildId or commit message',
			},
		],
	},
];
