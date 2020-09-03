import { INodeProperties } from "n8n-workflow";

export const contactTagOperations = [
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
				name: 'Create',
				value: 'create',
				description: 'Create an association',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an association',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactTagFields = [
	// ----------------------------------
	//         contactTag:create
	// ----------------------------------
	{
		displayName: 'Tag ID',
		name: 'tagId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
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
					'create',
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
					'delete',
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
] as INodeProperties[];
