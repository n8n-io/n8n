import {
	INodeProperties,
} from 'n8n-workflow';

export const userOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
			},
		},
		options: [
			{
				name: 'Get Current User',
				value: 'getCurrentUser',
			},
			{
				name: 'Get Current User Guilds',
				value: 'getCurrentUserGuilds',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Update Current User',
				value: 'updateCurrentUser',
			},
		],
		default: 'getCurrentUser',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const userFields = [
	{
		displayName: 'userId',
		name: 'userId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];