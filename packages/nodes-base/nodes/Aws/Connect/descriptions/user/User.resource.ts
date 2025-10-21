import type { INodeProperties } from 'n8n-workflow';
import { handleConnectError } from '../../helpers/errorHandler';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new user',
				action: 'Create a user',
				routing: {
					request: {
						method: 'PUT',
						url: '=/users/{{$parameter["instanceId"]}}',
					},
					output: {
						postReceive: [handleConnectError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user',
				action: 'Delete a user',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/users/{{$parameter["instanceId"]}}/{{$parameter["userId"]}}',
					},
					output: {
						postReceive: [handleConnectError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of a user',
				action: 'Describe a user',
				routing: {
					request: {
						method: 'GET',
						url: '=/users/{{$parameter["instanceId"]}}/{{$parameter["userId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'User',
								},
							},
							handleConnectError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all users',
				action: 'List users',
				routing: {
					request: {
						method: 'GET',
						url: '=/users-summary/{{$parameter["instanceId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'UserSummaryList',
								},
							},
							handleConnectError,
						],
					},
				},
			},
		],
	},
];

export const userFields: INodeProperties[] = [
	{
		displayName: 'Instance ID',
		name: 'instanceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		description: 'The identifier of the instance',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete', 'describe'],
			},
		},
		description: 'The identifier of the user',
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'The username for the user account',
		routing: {
			request: {
				body: {
					Username: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Phone Config',
		name: 'phoneConfig',
		type: 'json',
		required: true,
		default: '{"PhoneType": "SOFT_PHONE"}',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'Phone configuration (JSON format)',
		routing: {
			request: {
				body: {
					PhoneConfig: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
	{
		displayName: 'Security Profile IDs',
		name: 'securityProfileIds',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'Comma-separated list of security profile IDs',
		routing: {
			request: {
				body: {
					SecurityProfileIds: '={{ $value.split(",").map(s => s.trim()) }}',
				},
			},
		},
	},
	{
		displayName: 'Routing Profile ID',
		name: 'routingProfileId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'The routing profile ID for the user',
		routing: {
			request: {
				body: {
					RoutingProfileId: '={{ $value }}',
				},
			},
		},
	},
];
