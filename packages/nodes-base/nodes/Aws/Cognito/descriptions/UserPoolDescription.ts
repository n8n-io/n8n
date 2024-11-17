import type { INodeProperties } from 'n8n-workflow';

import { presendTest } from '../GenericFunctions';

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
				action: 'Describe the configuration of a user pool',
				routing: {
					send: {
						preSend: [presendTest], // ToDo: Remove this line before completing the pull request
					},
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool',
						},
					},
				},
			},
		],
		default: 'get',
	},
];

export const userPoolFields: INodeProperties[] = [
	{
		displayName: 'User Pool ID',
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
				displayName: 'From list', // ToDo: Fix error when selecting this option
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
				hint: 'Enter the user pool ID',
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
];
