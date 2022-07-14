import { INodeProperties } from 'n8n-workflow';

export const fileUploadDescription: INodeProperties[] = [
	{
		displayName: 'Input Data Field Name',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		required: true,
		description: 'The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG.',
	},
	{
		displayName: 'Category Name or ID',
		name: 'categoryId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getCompanyFileCategories',
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Share with Employee',
				name: 'share',
				type: 'boolean',
				default: true,
				description: 'Whether this file is shared or not',
			},
		],
	},
];
