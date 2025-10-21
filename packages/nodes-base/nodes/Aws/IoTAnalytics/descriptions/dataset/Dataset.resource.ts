import type { INodeProperties } from 'n8n-workflow';
import { handleIoTAnalyticsError } from '../../helpers/errorHandler';

export const datasetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['dataset'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a dataset',
				routing: {
					request: {
						method: 'POST',
						url: '/datasets',
					},
					output: {
						postReceive: [handleIoTAnalyticsError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a dataset',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/datasets/{{$parameter["datasetName"]}}',
					},
					output: {
						postReceive: [handleIoTAnalyticsError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe a dataset',
				routing: {
					request: {
						method: 'GET',
						url: '=/datasets/{{$parameter["datasetName"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'dataset',
								},
							},
							handleIoTAnalyticsError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				action: 'List datasets',
				routing: {
					request: {
						method: 'GET',
						url: '/datasets',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'datasetSummaries',
								},
							},
							handleIoTAnalyticsError,
						],
					},
				},
			},
		],
	},
];

export const datasetFields: INodeProperties[] = [
	{
		displayName: 'Dataset Name',
		name: 'datasetName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create', 'delete', 'describe'],
			},
		},
		routing: {
			request: {
				body: {
					datasetName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Actions',
		name: 'actions',
		type: 'json',
		required: true,
		default: '[]',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					actions: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
