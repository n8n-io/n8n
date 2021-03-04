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
				description: 'Returns the user object of the requester\'s account.',
			},
			{
				name: 'Get Current User Guilds',
				value: 'getCurrentUserGuilds',
				description: 'Returns a list of partial guild objects the current user is a member of.',
			},
			{
				name: 'Get User Connections',
				value: 'getUserConnections',
				description: 'Returns a list of connection objects.',
			},
		],
		default: 'getCurrentUser',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const userFields = [

	/* -------------------------------------------------------------------------- */
	/*                                user:getUser                                */
	/* -------------------------------------------------------------------------- */

] as INodeProperties[];
