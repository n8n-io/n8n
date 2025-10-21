import type { INodeProperties } from 'n8n-workflow';
import { handleLakeFormationError } from '../../helpers/errorHandler';

export const permissionsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['permissions'],
			},
		},
		options: [
			{
				name: 'Grant',
				value: 'grant',
				action: 'Grant permissions',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSLakeFormation.GrantPermissions',
						},
					},
					output: {
						postReceive: [handleLakeFormationError],
					},
				},
			},
			{
				name: 'Revoke',
				value: 'revoke',
				action: 'Revoke permissions',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSLakeFormation.RevokePermissions',
						},
					},
					output: {
						postReceive: [handleLakeFormationError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				action: 'List permissions',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AWSLakeFormation.ListPermissions',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'PrincipalResourcePermissions',
								},
							},
							handleLakeFormationError,
						],
					},
				},
			},
		],
	},
];

export const permissionsFields: INodeProperties[] = [
	{
		displayName: 'Principal',
		name: 'principal',
		type: 'json',
		required: true,
		default: '{}',
		displayOptions: {
			show: {
				resource: ['permissions'],
				operation: ['grant', 'revoke'],
			},
		},
		routing: {
			request: {
				body: {
					Principal: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
	{
		displayName: 'Resource',
		name: 'resourceConfig',
		type: 'json',
		required: true,
		default: '{}',
		displayOptions: {
			show: {
				resource: ['permissions'],
				operation: ['grant', 'revoke', 'list'],
			},
		},
		routing: {
			request: {
				body: {
					Resource: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
	{
		displayName: 'Permissions',
		name: 'permissions',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['permissions'],
				operation: ['grant', 'revoke'],
			},
		},
		routing: {
			request: {
				body: {
					Permissions: '={{ $value.split(",").map(s => s.trim()) }}',
				},
			},
		},
	},
];
