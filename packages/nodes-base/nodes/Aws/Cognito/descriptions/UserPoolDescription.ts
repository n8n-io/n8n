import type { INodeProperties } from 'n8n-workflow';

import { simplifyData } from '../generalFunctions/helpers';

export const userPoolOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['userPool'] } },
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
							simplifyData,
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
];

export const userPoolFields: INodeProperties[] = [
	{
		displayName: 'User Pool',
		name: 'userPoolId',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The ID of the user pool',
		displayOptions: { show: { resource: ['userPool'], operation: ['get'] } },
		routing: {
			send: {
				type: 'body',
				property: 'UserPoolId',
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUserPools',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w-]+_[0-9a-zA-Z]+$',
							errorMessage: 'The ID must follow the pattern "xxxxxx_xxxxxxxxxxx"',
						},
					},
				],
				placeholder: 'e.g. eu-central-1_ab12cdefgh',
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['userPool'],
				operation: ['get'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];
