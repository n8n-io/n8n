import type { INodeProperties } from 'n8n-workflow';

export const templateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['template'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a template',
				action: 'Get a template',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many templates',
				action: 'Get many templates',
			},
		],
		default: 'get',
	},
];

export const templateFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                template:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['template'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier for the template',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['template'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		displayOptions: {
			show: {
				resource: ['template'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
