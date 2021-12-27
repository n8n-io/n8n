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
];
