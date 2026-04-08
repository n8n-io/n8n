import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import { simplifyUserPool } from '../../helpers/utils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['userPool'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get user pool',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool',
						},
					},
					output: {
						postReceive: [
							simplifyUserPool,
							{
								type: 'rootProperty',
								properties: {
									property: 'UserPool',
								},
							},
						],
					},
				},
			},
		],
		default: 'get',
	},

	...get.description,
];
