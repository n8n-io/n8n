import {INodeProperties} from 'n8n-workflow';

export const contractOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'clientcontract',
				],
			},
		},
		options: [
			{
				name: 'delete',
				value: 'delete',
				description: 'Delete contract',
			},
			{
				name: 'add',
				value: 'add',
				description: 'Add/Update contract',
			},
			{
				name: 'Simple List with IDs',
				value: 'simple_list_with_ids',
				description: 'Get all items with Simple List',
			},
		],
		default: 'delete',
		description: 'The operation to perform.',
	},
];

export const contractFields: INodeProperties[] = [
	{
		displayName: 'Contract ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'clientcontract',
				],
				operation: [
					'delete', 'add',
				],
			},
		},
		default: '',
		description: 'Contract ID',
	},
	{
		displayName: 'Payload',
		name: 'payload',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'clientcontract',
				],
				operation: [
					'add',
				],
			},
		},
		default: '{"_approval_status": "Pass"}',
		description: 'JSON of payload, for example {"status": "approved"}',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'clientcontract',
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
				default: 'id__s=570,571',
				description: 'The query field accepts with gql syntax，id__eq=572',
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
