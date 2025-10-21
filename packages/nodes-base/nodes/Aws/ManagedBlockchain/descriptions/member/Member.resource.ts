import type { INodeProperties } from 'n8n-workflow';

export const memberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['member'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a member in a network',
				action: 'Create a member',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'TaigaWebService.CreateMember',
						},
						url: '=/networks/{{$parameter["networkId"]}}/members',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a member from a network',
				action: 'Delete a member',
				routing: {
					request: {
						method: 'DELETE',
						headers: {
							'X-Amz-Target': 'TaigaWebService.DeleteMember',
						},
						url: '=/networks/{{$parameter["networkId"]}}/members/{{$parameter["memberId"]}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get information about a member',
				action: 'Get a member',
				routing: {
					request: {
						method: 'GET',
						headers: {
							'X-Amz-Target': 'TaigaWebService.GetMember',
						},
						url: '=/networks/{{$parameter["networkId"]}}/members/{{$parameter["memberId"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List members in a network',
				action: 'Get many members',
				routing: {
					request: {
						method: 'GET',
						headers: {
							'X-Amz-Target': 'TaigaWebService.ListMembers',
						},
						url: '=/networks/{{$parameter["networkId"]}}/members',
					},
				},
			},
		],
		default: 'create',
	},
];

export const memberFields: INodeProperties[] = [
	{
		displayName: 'Network ID',
		name: 'networkId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['member'],
			},
		},
		default: '',
		description: 'The unique identifier of the network',
	},
	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['member'],
				operation: ['get', 'delete'],
			},
		},
		default: '',
		description: 'The unique identifier of the member',
	},
	{
		displayName: 'Member Configuration',
		name: 'MemberConfiguration',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['member'],
				operation: ['create'],
			},
		},
		default: '{"Name": "member-name", "Description": "Member description", "FrameworkConfiguration": {"Fabric": {"AdminUsername": "admin", "AdminPassword": "Password123"}}}',
		routing: {
			request: {
				body: {
					MemberConfiguration: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'Configuration for the member',
	},
	{
		displayName: 'Invitation ID',
		name: 'InvitationId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['member'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					InvitationId: '={{ $value }}',
				},
			},
		},
		description: 'The ID of the invitation to join the network',
	},
];
