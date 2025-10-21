import type { INodeProperties } from 'n8n-workflow';
import { handleQuickSightError } from '../../helpers/errorHandler';

export const dashboardOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['dashboard'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a dashboard',
				action: 'Delete a dashboard',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/accounts/{{$parameter["awsAccountId"]}}/dashboards/{{$parameter["dashboardId"]}}',
					},
					output: {
						postReceive: [handleQuickSightError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of a dashboard',
				action: 'Describe a dashboard',
				routing: {
					request: {
						method: 'GET',
						url: '=/accounts/{{$parameter["awsAccountId"]}}/dashboards/{{$parameter["dashboardId"]}}',
					},
					output: {
						postReceive: [handleQuickSightError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all dashboards',
				action: 'List dashboards',
				routing: {
					request: {
						method: 'GET',
						url: '=/accounts/{{$parameter["awsAccountId"]}}/dashboards',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'DashboardSummaryList',
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

export const dashboardFields: INodeProperties[] = [
	{
		displayName: 'AWS Account ID',
		name: 'awsAccountId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dashboard'],
			},
		},
		description: 'The AWS account ID',
	},
	{
		displayName: 'Dashboard ID',
		name: 'dashboardId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['dashboard'],
				operation: ['delete', 'describe'],
			},
		},
		description: 'The ID of the dashboard',
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		default: 100,
		displayOptions: {
			show: {
				resource: ['dashboard'],
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
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['dashboard'],
				operation: ['list'],
			},
		},
		description: 'Pagination token',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const nextToken = this.getNodeParameter('nextToken', 0) as string;
						if (nextToken) {
							requestOptions.qs = requestOptions.qs || {};
							(requestOptions.qs as any)['next-token'] = nextToken;
						}
						return requestOptions;
					},
				],
			},
		},
	},
];
