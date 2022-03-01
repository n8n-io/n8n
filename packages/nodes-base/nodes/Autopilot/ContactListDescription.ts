import {
	INodeProperties,
} from 'n8n-workflow';

export const contactListOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contactList',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add contact to list.',
			},
			{
				name: 'Exist',
				value: 'exist',
				description: 'Check if contact is on list.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts on list.',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a contact from a list.',
			},
		],
		default: 'add',
		description: 'Operation to perform.',
	},
];

export const contactListFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 contactList:add                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'listId',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getLists',
		},
		type: 'options',
		displayOptions: {
			show: {
				operation: [
					'add',
					'remove',
					'exist',
					'getAll',
				],
				resource: [
					'contactList',
				],
			},
		},
		default: '',
		description: 'ID of the list to operate on.',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'add',
					'remove',
					'exist',
				],
				resource: [
					'contactList',
				],
			},
		},
		default: '',
		description: 'Can be ID or email.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contactList:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contactList',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contactList',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
];
