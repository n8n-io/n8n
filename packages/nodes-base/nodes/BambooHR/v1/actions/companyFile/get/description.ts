import {
	CompanyFileProperties,
} from '../../Interfaces';

export const companyFileGetDescription: CompanyFileProperties = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
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
