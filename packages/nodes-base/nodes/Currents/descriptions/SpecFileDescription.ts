import type { INodeProperties } from 'n8n-workflow';

import {
	filterAuthorsOption,
	filterBranchesOption,
	filterGroupsOption,
	filterTagsOption,
	projectRLC,
} from './common.descriptions';

export const specFileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['specFile'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get aggregated spec file metrics for a project',
				routing: {
					request: {
						method: 'GET',
						url: '=/spec-files/{{$parameter["projectId"]}}',
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
				action: 'Get many spec files',
			},
		],
		default: 'getAll',
	},
];

export const specFileFields: INodeProperties[] = [
	// ----------------------------------
	//         specFile:getAll
	// ----------------------------------
	{
		...projectRLC,
		displayOptions: {
			show: {
				resource: ['specFile'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Date Start',
		name: 'dateStart',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['specFile'],
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
				resource: ['specFile'],
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
				resource: ['specFile'],
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
				resource: ['specFile'],
				operation: ['getAll'],
			},
		},
		options: [
			filterAuthorsOption,
			filterBranchesOption,
			filterGroupsOption,
			{
				displayName: 'Spec Name',
				name: 'specNameFilter',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'specNameFilter',
					},
				},
				description: 'Filter spec files by name (partial match)',
			},
			filterTagsOption,
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
				resource: ['specFile'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include Failed in Duration',
				name: 'includeFailedInDuration',
				type: 'boolean',
				default: false,
				routing: {
					send: {
						type: 'query',
						property: 'includeFailedInDuration',
					},
				},
				description: 'Whether to include failed executions in duration calculation',
			},
			{
				displayName: 'Order By',
				name: 'order',
				type: 'options',
				options: [
					{ name: 'Average Duration', value: 'avgDuration' },
					{ name: 'Failed Executions', value: 'failedExecutions' },
					{ name: 'Failure Rate', value: 'failureRate' },
					{ name: 'Flake Rate', value: 'flakeRate' },
					{ name: 'Flaky Executions', value: 'flakyExecutions' },
					{ name: 'Fully Reported', value: 'fullyReported' },
					{ name: 'Overall Executions', value: 'overallExecutions' },
					{ name: 'Suite Size', value: 'suiteSize' },
					{ name: 'Timeout Executions', value: 'timeoutExecutions' },
					{ name: 'Timeout Rate', value: 'timeoutRate' },
				],
				default: 'avgDuration',
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
