import type { INodeProperties } from 'n8n-workflow';

import {
	filterAuthorsOption,
	filterBranchesOption,
	filterGroupsOption,
	filterTagsOption,
	projectRLC,
} from './common.descriptions';

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
				name: 'Get many',
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
		...projectRLC,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Date start',
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
		displayName: 'Date end',
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
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getAll'],
			},
		},
		options: [
			filterAuthorsOption,
			filterBranchesOption,
			filterGroupsOption,
			{
				displayName: 'Minimum executions',
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
				displayName: 'Spec file',
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
			filterTagsOption,
			{
				displayName: 'Test state',
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
						property: 'test_state[]',
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
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Order by',
				name: 'order',
				type: 'options',
				options: [
					{ name: 'Duration', value: 'duration' },
					{ name: 'Duration delta', value: 'durationDelta' },
					{ name: 'Duration impact', value: 'durationXSamples' },
					{ name: 'Executions', value: 'executions' },
					{ name: 'Failure impact', value: 'failRateXSamples' },
					{ name: 'Failure rate delta', value: 'failureRateDelta' },
					{ name: 'Failures', value: 'failures' },
					{ name: 'Flakiness', value: 'flakiness' },
					{ name: 'Flakiness impact', value: 'flakinessXSamples' },
					{ name: 'Flakiness rate delta', value: 'flakinessRateDelta' },
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
				displayName: 'Sort direction',
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
			{
				displayName: 'Metric settings',
				name: 'metric_settings',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'metric_settings',
					},
				},
				description:
					'Override which test statuses are included in metric calculations. JSON object with optional keys: executions, avgDuration, flakinessRate, failureRate. Each value is an array of status strings: passed, failed, pending, skipped. Example: {"executions":["failed","passed"],"failureRate":["failed"]}',
				placeholder: '{"executions":["failed","passed"],"failureRate":["failed"]}',
			},
		],
	},
];
