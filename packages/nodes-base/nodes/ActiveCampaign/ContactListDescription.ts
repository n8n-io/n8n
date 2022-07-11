import {
	INodeProperties,
} from 'n8n-workflow';

export const contactListOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				description: 'Add contact to a list',
				action: 'Add a contact to a list',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove contact from a list',
				action: 'Remove a contact from a list',
			},
		],
		default: 'add',
	},
];

export const contactListFields: INodeProperties[] = [
	// ----------------------------------
	//         contactList:add
	// ----------------------------------
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'contactList',
				],
			},
		},
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'contactList',
				],
			},
		},
	},

	// ----------------------------------
	//         contactList:remove
	// ----------------------------------
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'remove',
				],
				resource: [
					'contactList',
				],
			},
		},
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'remove',
				],
				resource: [
					'contactList',
				],
			},
		},
	},
];
