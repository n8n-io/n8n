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
				description: 'Add contact to a list',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove contact from a list',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
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
		description: 'List ID',
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
		description: 'Contact ID',
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
		description: 'List ID',
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
		description: 'Contact ID',
	},
];
