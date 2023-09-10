import type { IDataObject, INodeProperties } from 'n8n-workflow';

export const collectionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a collection',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a collection',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many collections',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a collection',
			},
		],
		displayOptions: {
			show: {
				resource: ['collection'],
			},
		},
	},
];

export const collectionFields: INodeProperties[] = [
	// ----------------------------------
	//       collection: shared
	// ----------------------------------
	{
		displayName: 'Collection ID',
		name: 'collectionId',
		type: 'string',
		required: true,
		description: 'The identifier of the collection',
		default: '',
		placeholder: '5e59c8c7-e05a-4d17-8e85-acc301343926',
		displayOptions: {
			show: {
				resource: ['collection'],
				operation: ['delete', 'get', 'update'],
			},
		},
	},

	// ----------------------------------
	//       collection: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['collection'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 10,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['collection'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------
	//       collection: update
	// ----------------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		required: true,
		options: [
			{
				displayName: 'Group Names or IDs',
				name: 'groups',
				type: 'multiOptions',
				description:
					'The group to assign this collection to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				description: 'The external identifier to set to this collection',
				default: '',
			},
		],
		displayOptions: {
			show: {
				resource: ['collection'],
				operation: ['update'],
			},
		},
	},
];

export type CollectionUpdateFields = IDataObject & {
	groups: string[];
	externalId: string;
};
