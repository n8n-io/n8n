import {
	INodeProperties,
} from 'n8n-workflow';

export const searchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		description: 'Choose an operation',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'search',
				],
			},
		},
		options: [
			{
				name: 'Query',
				value: 'query',
				description: 'Search for something',
			},
		],
		default: 'query',
	},
];

export const searchFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                search:query                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Term',
		name: 'term',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'search',
				],
				operation: [
					'query',
				],
			},
		},
		default: '',
		description: 'Term to search for.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'search',
				],
				operation: [
					'query',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
];
