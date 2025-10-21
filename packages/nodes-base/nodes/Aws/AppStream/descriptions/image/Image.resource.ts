import type { INodeProperties } from 'n8n-workflow';
import { handleAppStreamError } from '../../helpers/errorHandler';

export const imageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe images',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'PhotonAdminProxyService.DescribeImages',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Images',
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

export const imageFields: INodeProperties[] = [
	{
		displayName: 'Image Names',
		name: 'imageNames',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['image'],
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
