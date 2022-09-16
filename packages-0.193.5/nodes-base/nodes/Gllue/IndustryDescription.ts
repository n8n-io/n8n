import {
	INodeProperties,
} from 'n8n-workflow';

export const industryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'industry',
				],
			},
		},
		options: [
			{
				name: 'Simple List with IDs',
				value: 'simple_list_with_ids',
				description: 'Get all items with Simple List',
			},
		],
		default: 'simple_list_with_ids',
		description: 'The operation to perform.',
	},
];

export const industryFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 industry:simple list with ids                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'industry',
				],
				operation: [
					'simple_list_with_ids',
				],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: 'id__s=2462,2455',
				description: 'The query field accepts with gql syntax，id__eq=2472',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'id,name',
				description: 'The fields need to return',
			},
		],
	},
];
