import {
	CompanyFileProperties,
} from '../../Interfaces';

export const companyFileUpdateDescription: CompanyFileProperties = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'companyFile',
				],
			},
		},
		default: '',
		description: 'ID of the company file',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'companyFile',
				],
			},
		},
		options: [
			{
				displayName: 'Category ID',
				name: 'categoryId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyCategories',
				},
				default: '',
				description: 'Move the file to a different category',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name of the file',
			},
			{
				displayName: 'Share With Employee',
				name: 'shareWithEmployee',
				type: 'boolean',
				default: true,
				description: 'Whether this file is shared or not',
			},
		],
	},
];
