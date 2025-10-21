import type { INodeProperties } from 'n8n-workflow';
import { handleQuickSightError } from '../../helpers/errorHandler';

export const analysisOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['analysis'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an analysis',
				action: 'Delete an analysis',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/accounts/{{$parameter["awsAccountId"]}}/analyses/{{$parameter["analysisId"]}}',
					},
					output: {
						postReceive: [handleQuickSightError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of an analysis',
				action: 'Describe an analysis',
				routing: {
					request: {
						method: 'GET',
						url: '=/accounts/{{$parameter["awsAccountId"]}}/analyses/{{$parameter["analysisId"]}}',
					},
					output: {
						postReceive: [handleQuickSightError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all analyses',
				action: 'List analyses',
				routing: {
					request: {
						method: 'GET',
						url: '=/accounts/{{$parameter["awsAccountId"]}}/analyses',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'AnalysisSummaryList',
								},
							},
							handleQuickSightError,
						],
					},
				},
			},
		],
	},
];

export const analysisFields: INodeProperties[] = [
	{
		displayName: 'AWS Account ID',
		name: 'awsAccountId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['analysis'],
			},
		},
		description: 'The AWS account ID',
	},
	{
		displayName: 'Analysis ID',
		name: 'analysisId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['analysis'],
				operation: ['delete', 'describe'],
			},
		},
		description: 'The ID of the analysis',
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		default: 100,
		displayOptions: {
			show: {
				resource: ['analysis'],
				operation: ['list'],
			},
		},
		description: 'Max number of results to return',
		routing: {
			request: {
				qs: {
					'max-results': '={{ $value }}',
				},
			},
		},
	},
];
