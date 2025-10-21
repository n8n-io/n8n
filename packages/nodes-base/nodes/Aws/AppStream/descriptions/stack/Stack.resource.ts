import type { INodeProperties } from 'n8n-workflow';
import { handleAppStreamError } from '../../helpers/errorHandler';

export const stackOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['stack'],
			},
		},
		options: [
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe stacks',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'PhotonAdminProxyService.DescribeStacks',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Stacks',
								},
							},
							handleAppStreamError,
						],
					},
				},
			},
		],
	},
];

export const stackFields: INodeProperties[] = [
	{
		displayName: 'Stack Names',
		name: 'stackNames',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['stack'],
			},
		},
		routing: {
			request: {
				body: {
					Names: '={{ $value ? $value.split(",").map(s => s.trim()) : undefined }}',
				},
			},
		},
	},
];
