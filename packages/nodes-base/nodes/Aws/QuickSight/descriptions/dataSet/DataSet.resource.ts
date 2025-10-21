import type { INodeProperties } from 'n8n-workflow';
import { handleQuickSightError } from '../../helpers/errorHandler';

export const dataSetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['dataSet'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a data set',
				action: 'Delete a data set',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/accounts/{{$parameter["awsAccountId"]}}/data-sets/{{$parameter["dataSetId"]}}',
					},
					output: {
						postReceive: [handleQuickSightError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of a data set',
				action: 'Describe a data set',
				routing: {
					request: {
						method: 'GET',
						url: '=/accounts/{{$parameter["awsAccountId"]}}/data-sets/{{$parameter["dataSetId"]}}',
					},
					output: {
						postReceive: [handleQuickSightError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all data sets',
				action: 'List data sets',
				routing: {
					request: {
						method: 'GET',
						url: '=/accounts/{{$parameter["awsAccountId"]}}/data-sets',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'DataSetSummaries',
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

export const dataSetFields: INodeProperties[] = [
	{
		displayName: 'AWS Account ID',
		name: 'awsAccountId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataSet'],
			},
		},
		description: 'The AWS account ID',
	},
	{
		displayName: 'Data Set ID',
		name: 'dataSetId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dataSet'],
				operation: ['delete', 'describe'],
			},
		},
		description: 'The ID of the data set',
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		default: 100,
		displayOptions: {
			show: {
				resource: ['dataSet'],
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
