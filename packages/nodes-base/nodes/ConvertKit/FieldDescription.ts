import {
	INodeProperties
} from 'n8n-workflow';

export const fieldOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'field',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a field.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a field.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: `List all of your account's custom fields.`,
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a field.',
			},
		],
		default: 'update',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const fieldFields = [
	{
		displayName: 'Field ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'field',
				],
				operation: [
					'update',
					'delete',
				],
			},
		},
		default: '',
		description: 'The ID of your custom field.',
	},
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'field',
				],
				operation: [
					'update',
					'create',
				],
			},
		},
		default: '',
		description: 'The label of the custom field.',
	},
] as INodeProperties[];
