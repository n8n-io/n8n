import type { INodeProperties } from 'n8n-workflow';

export const fields: INodeProperties[] = [
	{
		displayName: 'Search parameters',
		name: 'search_parameters',
		description: 'You can use a variety of query parameters to search and filter items',
		placeholder: 'Add parameter',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Parameters',
				name: 'parameters',
				values: [
					{
						displayName: 'Parameter name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the search parameter to set',
					},
					{
						displayName: 'Parameter value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the search parameter to set',
					},
				],
			},
		],
	},
];
