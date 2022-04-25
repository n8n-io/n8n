import {
	INodeProperties,
} from 'n8n-workflow';

export const collectionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
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
		description: 'The identifier of the collection.',
		default: '',
		placeholder: '5e59c8c7-e05a-4d17-8e85-acc301343926',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'delete',
					'get',
					'update',
				],
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
		description: 'Return all available results for the query.',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'Number of results to return for the query.',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
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
				displayName: 'Group',
				name: 'groups',
				type: 'multiOptions',
				description: 'The group to assign this collection to.',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				description: 'The external identifier to set to this collection.',
				default: '',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'update',
				],
			},
		},
	},
];

export interface CollectionUpdateFields {
	groups: string[];
	externalId: string;
}
