import {
	CompanyFileProperties,
} from '../../Interfaces';

export const companyFileDelDescription: CompanyFileProperties = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'del',
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
