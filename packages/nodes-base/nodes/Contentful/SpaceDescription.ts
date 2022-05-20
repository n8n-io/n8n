import {
	INodeProperties,
} from 'n8n-workflow';

export const resource = {
	name: 'Space',
	value: 'space',
};

export const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
];

export const fields: INodeProperties[] = [];
