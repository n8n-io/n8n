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
				description: 'Returns details of the requesters account',
			},
		],
		default: 'getCurrentUser',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const userFields = [

	/* -------------------------------------------------------------------------- */
	/*                                activity:create                             */
	/* -------------------------------------------------------------------------- */


] as INodeProperties[];
