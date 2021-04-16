import {
	INodeProperties,
} from 'n8n-workflow';

export const directMessageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'directMessage',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const directMessageFields = [
] as INodeProperties[];