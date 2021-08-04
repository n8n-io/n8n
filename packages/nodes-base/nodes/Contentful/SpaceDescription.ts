import {
	INodeProperties,
} from 'n8n-workflow';

export const resource = {
	name: 'Space',
	value: 'space',
};

export const operations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					resource.value,
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const fields = [] as INodeProperties[];
