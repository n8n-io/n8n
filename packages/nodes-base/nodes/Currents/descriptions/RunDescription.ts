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
				name: 'Cancel by GitHub CI',
				value: 'cancelGithub',
				description: 'Cancel a run by GitHub Actions workflow run ID',
				routing: {
					request: {
						method: 'PUT',
						url: '/runs/cancel-ci/github',
					},
				},
				action: 'Cancel a run by GitHub CI',
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
			{
				name: 'Reset',
				value: 'reset',
				description: 'Reset failed specs for re-execution on specified machines',
				routing: {
					request: {
						method: 'PUT',
						url: '=/runs/{{$parameter["runId"]}}/reset',
					},
				},
				action: 'Reset a run',
			},
		],
		default: 'getAll',
	},
];

export const runFields: INodeProperties[] = [
	// ----------------------------------
	//         run:get, cancel, delete, reset
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
				operation: ['get', 'cancel', 'delete', 'reset'],
			},
		},
		description: 'The ID of the run',
	},

	// ----------------------------------
	//         run:reset
	// ----------------------------------
	{
		displayName: 'Machine IDs',
		name: 'machineIds',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['reset'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'machineId',
				value: '={{ $value.split(",").map(id => id.trim()) }}',
			},
		},
		description: 'Comma-separated list of machine identifiers to reset (1-63 items)',
	},
	{
		displayName: 'Options',
		name: 'resetOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['reset'],
			},
		},
		options: [
			{
				displayName: 'Batched Orchestration',
				name: 'isBatchedOr8n',
				type: 'boolean',
				default: false,
				routing: {
					send: {
						type: 'body',
						property: 'isBatchedOr8n',
					},
				},
				description: 'Whether to enable batched orchestration',
			},
		],
	},

	// ----------------------------------
	//         run:cancelGithub
	// ----------------------------------
	{
		displayName: 'GitHub Run ID',
		name: 'githubRunId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['cancelGithub'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'githubRunId',
			},
		},
		description: 'The GitHub Actions workflow run ID',
	},
	{
		displayName: 'GitHub Run Attempt',
		name: 'githubRunAttempt',
		type: 'number',
		required: true,
		default: 1,
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['cancelGithub'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'githubRunAttempt',
			},
		},
		description: 'The GitHub Actions workflow attempt number',
	},
	{
		displayName: 'Options',
		name: 'cancelGithubOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['cancelGithub'],
			},
		},
		options: [
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'projectId',
					},
				},
				description: 'Limit cancellation to a specific project',
			},
			{
				displayName: 'CI Build ID',
				name: 'ciBuildId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'ciBuildId',
					},
				},
				description: 'Limit cancellation to a specific CI build',
			},
		],
	},

	// ----------------------------------
	//         run:find
	// ----------------------------------
	{
		displayName: 'Project',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['find', 'getAll'],
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
		routing: {
			send: {
				type: 'query',
				property: 'projectId',
				value: '={{ $value }}',
			},
		},
		description: 'The Currents project',
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
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['run'],
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
				displayName: 'Authors',
				name: 'author',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'author',
					},
				},
				description: 'Filter by git commit author names (comma-separated for multiple)',
			},
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
				description: 'Search by ciBuildId or commit message (max 200 characters)',
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
				description: 'Filter by tags (comma-separated for multiple)',
			},
			{
				displayName: 'Tag Operator',
				name: 'tagOperator',
				type: 'options',
				options: [
					{ name: 'AND', value: 'AND', description: 'All tags must be present' },
					{ name: 'OR', value: 'OR', description: 'Any tag must be present' },
				],
				default: 'AND',
				routing: {
					send: {
						type: 'query',
						property: 'tag_operator',
					},
				},
				description: 'Logical operator for tag filtering',
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
				resource: ['run'],
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
				description: 'Cursor for forward pagination (use cursor from previous response)',
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
				description: 'Cursor for backward pagination (use cursor from previous response)',
			},
		],
	},
];
