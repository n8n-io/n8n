import {
	INodeProperties,
} from 'n8n-workflow';

export const organizationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Import',
				value: 'import',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'organization',
				],
			},
		},
	},
] as INodeProperties[];
