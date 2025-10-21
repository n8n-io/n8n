import type { INodeProperties } from 'n8n-workflow';
import { handleIoTAnalyticsError } from '../../helpers/errorHandler';

export const pipelineOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['pipeline'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a pipeline',
				routing: {
					request: {
						method: 'POST',
						url: '/pipelines',
					},
					output: {
						postReceive: [handleIoTAnalyticsError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a pipeline',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/pipelines/{{$parameter["pipelineName"]}}',
					},
					output: {
						postReceive: [handleIoTAnalyticsError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe a pipeline',
				routing: {
					request: {
						method: 'GET',
						url: '=/pipelines/{{$parameter["pipelineName"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'pipeline',
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
				action: 'List pipelines',
				routing: {
					request: {
						method: 'GET',
						url: '/pipelines',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'pipelineSummaries',
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

export const pipelineFields: INodeProperties[] = [
	{
		displayName: 'Pipeline Name',
		name: 'pipelineName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['pipeline'],
				operation: ['create', 'delete', 'describe'],
			},
		},
		routing: {
			request: {
				body: {
					pipelineName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Pipeline Activities',
		name: 'pipelineActivities',
		type: 'json',
		required: true,
		default: '[]',
		displayOptions: {
			show: {
				resource: ['pipeline'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					pipelineActivities: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
