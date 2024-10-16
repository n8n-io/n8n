import type { FileProperties } from '../../Interfaces';

export const fileUpdateDescription: FileProperties = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['file'],
			},
		},
		default: '',
		description: 'ID of the file',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['file'],
			},
		},
		options: [
			{
				displayName: 'Category Name or ID',
				name: 'categoryId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyFileCategories',
				},
				default: '',
				description:
					'Move the file to a different category. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name of the file',
			},
			{
				displayName: 'Share with Employee',
				name: 'shareWithEmployee',
				type: 'boolean',
				default: true,
				description: 'Whether this file is shared or not',
			},
		],
	},
];
