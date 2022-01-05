import { INodeProperties } from 'n8n-workflow';

export const companyUploadDescription: INodeProperties[] = [
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
					'companyFile',
				],
			},
		},
		required: true,
		description: 'The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG',
	},
	{
		displayName: 'Category ID',
		name: 'categoryId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCompanyCategories',
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'companyFile',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Share With Employee',
		name: 'share',
		type: 'boolean',
		default: true,
		description: 'Whether this file is shared or not',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'companyFile',
				],
			},
		},
	},
];
