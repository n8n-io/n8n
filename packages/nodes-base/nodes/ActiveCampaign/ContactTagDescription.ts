import {
	INodeProperties,
} from 'n8n-workflow';

export const contactTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contactTag',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a tag to a contact',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a tag from a contact',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
];

export const contactTagFields: INodeProperties[] = [
	// ----------------------------------
	//         contactTag:add
	// ----------------------------------
	{
		displayName: 'Tag ID',
		name: 'tagId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'contactTag',
				],
			},
		},
		description: 'Tag ID',
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
					'contactTag',
				],
			},
		},
		description: 'Contact ID',
	},
	// ----------------------------------
	//         contactTag:delete
	// ----------------------------------
	{
		displayName: 'Contact Tag ID',
		name: 'contactTagId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'remove',
				],
				resource: [
					'contactTag',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the contact tag to delete.',
	},
];
