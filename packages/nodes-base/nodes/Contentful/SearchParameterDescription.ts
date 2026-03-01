import type { INodeProperties } from 'n8n-workflow';

export const fields: INodeProperties[] = [
	{
		displayName: 'Search Parameters',
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
						displayName: 'Parameter Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the search parameter to set',
					},
					{
						displayName: 'Parameter Value',
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
