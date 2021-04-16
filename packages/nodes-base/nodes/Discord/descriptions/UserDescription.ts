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
		],
		default: 'getCurrentUser',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const userFields = [
	{
		displayName: 'User ID',
		name: 'userId',
		description: 'ID of the user to retrieve',
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
