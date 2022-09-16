import {INodeProperties} from 'n8n-workflow';

export const billinginfoOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'billinginfo',
				],
			},
		},
		options: [
			{
				name: 'Detail',
				value: 'detail',
				description: 'Get billinginfo detail',
			},
			{
				name: 'Simple List with IDs',
				value: 'simple_list_with_ids',
				description: 'Get all items with Simple List',
			},
		],
		default: 'Detail',
		description: 'Get billinginfo detail',
	},
];

export const billinginfoFields: INodeProperties[] = [
	{
		displayName: 'BillingInfo ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'billinginfo',
				],
				operation: [
					'detail',
				],
			},
		},
		default: '',
		description: 'BillingInfo ID',
	},
	{
		displayName: 'BillingInfo ID',
		name: 'billinfoid',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'billinginfo',
				],
				operation: [
					'detail',
				],
			},
		},
		default: '',
		description: 'BillingInfo ID',
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
					'billinginfo',
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
