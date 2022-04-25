import {
	INodeProperties,
} from 'n8n-workflow';

export const templateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'template',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a template',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all templates',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const templateFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 template:get                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'template',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Unique identifier for the template.',
	},
];
