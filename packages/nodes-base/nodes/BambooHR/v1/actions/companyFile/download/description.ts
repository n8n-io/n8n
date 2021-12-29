import {
	CompanyFileProperties,
} from '../../Interfaces';

export const companyFileDownloadDescription: CompanyFileProperties = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'download',
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
		displayName: 'Put Output In Field',
		name: 'output',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The name of the output field to put the binary file data in',
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'companyFile',
				],
			},
		},
	},
];
