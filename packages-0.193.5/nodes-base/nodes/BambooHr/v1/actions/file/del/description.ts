import { FileProperties } from '../../Interfaces';

export const fileDelDescription: FileProperties = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['file'],
			},
		},
		default: '',
		description: 'ID of the file',
	},
];
