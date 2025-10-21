import type { INodeProperties } from 'n8n-workflow';
import { handleKendraError } from '../../helpers/errorHandler';

export const queryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'query',
		displayOptions: {
			show: {
				resource: ['query'],
			},
		},
		options: [
			{
				name: 'Query',
				value: 'query',
				description: 'Search the index',
				action: 'Query the index',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSKendraFrontendService.Query',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'ResultItems',
								},
							},
							handleKendraError,
						],
					},
				},
			},
		],
	},
];

export const queryFields: INodeProperties[] = [
	{
		displayName: 'Index ID',
		name: 'indexId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['query'],
			},
		},
		description: 'The identifier of the index',
		routing: {
			request: {
				body: {
					IndexId: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Query Text',
		name: 'queryText',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['query'],
			},
		},
		description: 'The search query text',
		routing: {
			request: {
				body: {
					QueryText: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		default: 10,
		displayOptions: {
			show: {
				resource: ['query'],
			},
		},
		description: 'Number of results to return',
		routing: {
			request: {
				body: {
					PageSize: '={{ $value }}',
				},
			},
		},
	},
];
